import { MovimentoTipo, Prisma, type FormaPagamento } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';
import type { AbrirCaixaInput, FecharCaixaInput, ListarMovimentosInput, MovimentoCaixaInput } from './caixa.schema';

type Ctx = { userId: string; ip?: string; userAgent?: string };

function d(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function n(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

async function logAudit(ctx: Ctx, acao: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      acao,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}

async function getCaixaAberto(userId: string) {
  return prisma.caixa.findFirst({
    where: { operadorId: userId, status: 'ABERTO' },
    orderBy: { aberturaEm: 'desc' },
  });
}

async function calcularIndicadoresCaixa(caixaId: string) {
  const vendas = await prisma.venda.findMany({
    where: { caixaId, status: 'CONCLUIDA' },
    select: { total: true, pagamentoDetalhe: true },
  });
  const movimentos = await prisma.caixaMovimento.findMany({
    where: { caixaId },
    select: { tipo: true, valor: true },
  });

  let totalDinheiro = 0;
  let totalCartao = 0;
  let totalPix = 0;
  let quantidadeVendas = 0;

  for (const venda of vendas) {
    quantidadeVendas += 1;
    const detalhe = Array.isArray(venda.pagamentoDetalhe)
      ? venda.pagamentoDetalhe as Array<{ formaPagamento?: FormaPagamento; tipo?: string; valor: number }>
      : [];
    if (detalhe.length === 0) totalDinheiro += n(venda.total);
    for (const p of detalhe) {
      const tipo = p.formaPagamento ?? p.tipo;
      if (tipo === 'DINHEIRO') totalDinheiro += p.valor;
      if (tipo === 'PIX') totalPix += p.valor;
      if (tipo === 'CARTAO' || tipo === 'CARTAO_CREDITO' || tipo === 'CARTAO_DEBITO') totalCartao += p.valor;
    }
  }

  const totalSangria = movimentos.filter((m) => m.tipo === 'SANGRIA').reduce((s, m) => s + n(m.valor), 0);
  const totalSuprimento = movimentos.filter((m) => m.tipo === 'SUPRIMENTO').reduce((s, m) => s + n(m.valor), 0);
  const totalVendas = vendas.reduce((s, v) => s + n(v.total), 0);
  const ticketMedio = quantidadeVendas ? totalVendas / quantidadeVendas : 0;

  return {
    totalDinheiro,
    totalCartao,
    totalPix,
    totalSangria,
    totalSuprimento,
    ticketMedio,
    quantidadeVendas,
  };
}

export const caixaService = {
  async abrir(input: AbrirCaixaInput, ctx: Ctx) {
    const jaAberto = await getCaixaAberto(ctx.userId);
    if (jaAberto) throw new AppError(409, 'Ja existe caixa aberto para este operador', 'CAIXA_JA_ABERTO');

    const caixa = await prisma.caixa.create({
      data: {
        operadorId: ctx.userId,
        valorInicial: d(input.valorInicial),
        movimentos: {
          create: {
            operadorId: ctx.userId,
            tipo: MovimentoTipo.ABERTURA,
            valor: d(input.valorInicial),
            formaPagamento: 'DINHEIRO',
            descricao: input.descricao ?? 'Abertura de caixa',
          },
        },
      },
    });
    await logAudit(ctx, 'CAIXA_ABERTURA');
    return caixa;
  },

  async registrarSangria(input: MovimentoCaixaInput, ctx: Ctx) {
    const caixa = await getCaixaAberto(ctx.userId);
    if (!caixa) throw new AppError(400, 'Nao ha caixa aberto para o operador', 'CAIXA_FECHADO');

    const indicador = await calcularIndicadoresCaixa(caixa.id);
    const saldoDisponivel = n(caixa.valorInicial) + indicador.totalDinheiro + indicador.totalSuprimento - indicador.totalSangria;
    if (input.valor > saldoDisponivel) {
      throw new AppError(400, 'Valor de sangria excede o saldo disponivel em dinheiro', 'SALDO_INSUFICIENTE');
    }

    const mov = await prisma.caixaMovimento.create({
      data: {
        caixaId: caixa.id,
        operadorId: ctx.userId,
        tipo: MovimentoTipo.SANGRIA,
        valor: d(input.valor),
        formaPagamento: 'DINHEIRO',
        descricao: input.motivo,
      },
    });
    await logAudit(ctx, 'CAIXA_SANGRIA');
    return mov;
  },

  async registrarSuprimento(input: MovimentoCaixaInput, ctx: Ctx) {
    const caixa = await getCaixaAberto(ctx.userId);
    if (!caixa) throw new AppError(400, 'Nao ha caixa aberto para o operador', 'CAIXA_FECHADO');

    const mov = await prisma.caixaMovimento.create({
      data: {
        caixaId: caixa.id,
        operadorId: ctx.userId,
        tipo: MovimentoTipo.SUPRIMENTO,
        valor: d(input.valor),
        formaPagamento: 'DINHEIRO',
        descricao: input.motivo,
      },
    });
    await logAudit(ctx, 'CAIXA_SUPRIMENTO');
    return mov;
  },

  async fechar(input: FecharCaixaInput, ctx: Ctx) {
    const caixa = await getCaixaAberto(ctx.userId);
    if (!caixa) throw new AppError(400, 'Nao ha caixa aberto para o operador', 'CAIXA_FECHADO');

    const indicador = await calcularIndicadoresCaixa(caixa.id);
    const totalEsperadoDinheiro = n(caixa.valorInicial) + indicador.totalDinheiro + indicador.totalSuprimento - indicador.totalSangria;
    const diferenca = input.valorContadoDinheiro - totalEsperadoDinheiro;

    if (Math.abs(diferenca) >= 0.01 && (!input.justificativa || input.justificativa.trim().length < 5)) {
      throw new AppError(400, 'Justificativa obrigatoria para divergencia no fechamento', 'JUSTIFICATIVA_OBRIGATORIA');
    }

    const result = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.caixa.update({
        where: { id: caixa.id },
        data: {
          status: 'FECHADO',
          fechamentoEm: new Date(),
          valorEsperadoFechamento: d(totalEsperadoDinheiro),
          valorContadoFechamento: d(input.valorContadoDinheiro),
          diferencaFechamento: d(diferenca),
          justificativaDivergencia: input.justificativa?.trim() || null,
          movimentos: {
            create: {
              operadorId: ctx.userId,
              tipo: MovimentoTipo.FECHAMENTO,
              valor: d(input.valorContadoDinheiro),
              formaPagamento: 'DINHEIRO',
              descricao: input.justificativa?.trim() || 'Fechamento de caixa',
            },
          },
        },
      });
      return atualizado;
    });

    await logAudit(ctx, 'CAIXA_FECHAMENTO');
    return {
      caixaId: result.id,
      operadorId: ctx.userId,
      fechamentoEm: result.fechamentoEm,
      totalEsperado: totalEsperadoDinheiro,
      totalContado: input.valorContadoDinheiro,
      diferenca,
      justificativa: input.justificativa?.trim() || null,
      indicadores: indicador,
    };
  },

  async caixaAtivo(ctx: Ctx) {
    const caixa = await getCaixaAberto(ctx.userId);
    if (!caixa) return null;
    const indicadores = await calcularIndicadoresCaixa(caixa.id);
    return { caixa, indicadores };
  },

  async historico(ctx: Ctx, query: ListarMovimentosInput) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const [dados, total] = await Promise.all([
      prisma.caixaMovimento.findMany({
        where: { operadorId: ctx.userId },
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
      }),
      prisma.caixaMovimento.count({ where: { operadorId: ctx.userId } }),
    ]);
    return { dados, total, page, totalPages: Math.ceil(total / limit) };
  },

  async clearHistory(ctx: Ctx) {
    const result = await prisma.$transaction(async (tx) => {
      // Ordem importa por causa das FKs (evita falha intermitente ao apagar em paralelo).
      const payments = await tx.payment.deleteMany({});
      const itensVenda = await tx.itemVenda.deleteMany({});
      const movimentos = await tx.caixaMovimento.deleteMany({});
      const vendas = await tx.venda.deleteMany({});
      const caixas = await tx.caixa.deleteMany({});
      return {
        vendasRemovidas: vendas.count,
        movimentosRemovidos: movimentos.count,
        caixasRemovidos: caixas.count,
        pagamentosRemovidos: payments.count,
        itensRemovidos: itensVenda.count,
      };
    });
    await logAudit(ctx, 'CAIXA_HISTORICO_LIMPO');
    return result;
  },

  async indicadores(ctx: Ctx) {
    const caixa = await getCaixaAberto(ctx.userId);
    if (!caixa) {
      return {
        caixaAberto: false,
        totalDinheiro: 0,
        totalCartao: 0,
        totalPix: 0,
        totalSangria: 0,
        totalSuprimento: 0,
        ticketMedio: 0,
        quantidadeVendas: 0,
      };
    }
    const indicadores = await calcularIndicadoresCaixa(caixa.id);
    return { caixaAberto: true, ...indicadores };
  },
};
