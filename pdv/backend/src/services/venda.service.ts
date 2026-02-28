import { PaymentTipo, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import type { CreateVendaInput, QueryVendaInput } from '../validations/venda.schema';

type Ctx = { userId: string; ip?: string; userAgent?: string };

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value);
const n = (value: Prisma.Decimal | number): number => Number(value);
const round2 = (value: number): number => Math.round(value * 100) / 100;

function toCaixaFormaPagamento(tipo: PaymentTipo) {
  if (tipo === 'DINHEIRO') return 'DINHEIRO' as const;
  if (tipo === 'PIX') return 'PIX' as const;
  return 'CARTAO' as const;
}

export const vendaService = {
  async list(query: QueryVendaInput) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const [vendas, total] = await Promise.all([
      prisma.venda.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          operador: { select: { id: true, nome: true, email: true, role: true } },
          caixa: { select: { id: true, aberturaEm: true, fechamentoEm: true, status: true } },
          pagamentos: true,
          itens: {
            include: { produto: { select: { id: true, nome: true, codigo: true } } },
          },
        },
      }),
      prisma.venda.count(),
    ]);
    return { dados: vendas, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const v = await prisma.venda.findUnique({
      where: { id },
      include: {
        operador: { select: { id: true, nome: true, email: true, role: true } },
        caixa: true,
        pagamentos: true,
        itens: {
          include: { produto: true },
        },
      },
    });
    if (!v) throw new AppError(404, 'Venda nao encontrada', 'NOT_FOUND');
    return v;
  },

  async create(data: CreateVendaInput, ctx: Ctx) {
    const caixaAtivo = await prisma.caixa.findFirst({
      where: {
        operadorId: ctx.userId,
        status: 'ABERTO',
      },
    });
    if (!caixaAtivo) {
      throw new AppError(400, 'Caixa fechado. Abra o caixa antes de vender.', 'CAIXA_FECHADO');
    }

    const itens = await Promise.all(
      data.itens.map(async (item) => {
        const produto = await prisma.produto.findUnique({
          where: { id: item.produtoId },
        });
        if (!produto) throw new AppError(404, `Produto ${item.produtoId} nao encontrado`, 'NOT_FOUND');
        if (produto.estoque < item.quantidade) {
          throw new AppError(
            400,
            `Estoque insuficiente para "${produto.nome}". Disponivel: ${produto.estoque}`,
            'INSUFFICIENT_STOCK'
          );
        }
        return {
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnit: decimal(item.precoUnit),
          subtotal: item.quantidade * item.precoUnit,
        };
      })
    );

    const subtotal = round2(itens.reduce((s, i) => s + i.subtotal, 0));
    const desconto = round2(data.desconto ?? 0);
    if (desconto < 0 || desconto > subtotal) {
      throw new AppError(400, 'Desconto invalido para o subtotal da venda', 'INVALID_DISCOUNT');
    }
    const total = round2(subtotal - desconto);
    const totalPagamentos = round2(data.pagamentos.reduce((sum, p) => sum + p.valor, 0));
    if (Math.abs(totalPagamentos - total) >= 0.01) {
      throw new AppError(400, 'Soma dos pagamentos difere do total da venda', 'PAYMENT_MISMATCH');
    }

    for (const pagamento of data.pagamentos) {
      if (pagamento.tipo === 'DINHEIRO') {
        if (pagamento.valorRecebido !== undefined && pagamento.valorRecebido < pagamento.valor) {
          throw new AppError(400, 'Valor recebido em dinheiro deve ser maior ou igual ao valor pago', 'INVALID_CASH_AMOUNT');
        }
      }
      if (pagamento.tipo === 'PIX' && pagamento.confirmado !== true) {
        throw new AppError(400, 'Pagamento PIX deve ser confirmado antes de concluir a venda', 'PIX_NOT_CONFIRMED');
      }
      if (pagamento.tipo === 'CARTAO_CREDITO') {
        if (!pagamento.parcelas || pagamento.parcelas < 1 || pagamento.parcelas > 12) {
          throw new AppError(400, 'Cartao de credito requer parcelas entre 1 e 12', 'INVALID_INSTALLMENTS');
        }
      }
    }

    const formaPagamento =
      data.pagamentos.length === 1 ? toCaixaFormaPagamento(data.pagamentos[0].tipo) : 'MISTO';

    return prisma.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          caixaId: caixaAtivo.id,
          operadorId: ctx.userId,
          subtotal: decimal(subtotal),
          desconto: decimal(desconto),
          total: decimal(total),
          cpf: data.cpf?.trim() || null,
          cliente: data.cliente?.trim() || null,
          observacao: data.observacao?.trim() || null,
          formaPagamento,
          pagamentoDetalhe: data.pagamentos.map((p) => ({
            tipo: p.tipo,
            valor: p.valor,
            parcelas: p.parcelas ?? null,
            troco: p.tipo === 'DINHEIRO' ? round2((p.valorRecebido ?? p.valor) - p.valor) : 0,
          })),
          itens: {
            create: itens.map(({ produtoId, quantidade, precoUnit, subtotal: itemSubtotal }) => ({
              produtoId,
              quantidade,
              precoUnit,
              subtotal: decimal(itemSubtotal),
            })),
          },
        },
        include: {
          pagamentos: true,
          itens: {
            include: { produto: { select: { id: true, nome: true, codigo: true } } },
          },
        },
      });

      for (const item of data.itens) {
        const updated = await tx.produto.updateMany({
          where: { id: item.produtoId, estoque: { gte: item.quantidade } },
          data: { estoque: { decrement: item.quantidade } },
        });
        if (updated.count === 0) {
          throw new AppError(400, 'Estoque insuficiente para concluir venda', 'INSUFFICIENT_STOCK');
        }
      }

      for (const pagamento of data.pagamentos) {
        const troco = pagamento.tipo === 'DINHEIRO' ? round2((pagamento.valorRecebido ?? pagamento.valor) - pagamento.valor) : 0;
        await tx.payment.create({
          data: {
            vendaId: venda.id,
            tipo: pagamento.tipo,
            valor: decimal(pagamento.valor),
            parcelas: pagamento.tipo === 'CARTAO_CREDITO' ? pagamento.parcelas ?? 1 : null,
            troco: decimal(troco),
          },
        });
        await tx.caixaMovimento.create({
          data: {
            caixaId: caixaAtivo.id,
            operadorId: ctx.userId,
            tipo: 'VENDA',
            valor: decimal(pagamento.valor),
            formaPagamento: toCaixaFormaPagamento(pagamento.tipo),
            descricao: `Venda ${venda.id.slice(0, 8)}`,
            referenciaVenda: venda.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: ctx.userId,
          acao: 'VENDA_REGISTRADA',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
      });

      return venda;
    });
  },

  async clearHistory() {
    return prisma.$transaction(async (tx) => {
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
  },
};
