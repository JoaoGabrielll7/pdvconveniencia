import { z } from 'zod';

export const itemVendaSchema = z.object({
  produtoId: z.string().uuid(),
  quantidade: z.number().int().positive('Quantidade deve ser positiva'),
  precoUnit: z.number().positive('Preco unitario deve ser positivo'),
});

export const pagamentoVendaSchema = z.object({
  tipo: z.enum(['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
  valor: z.number().positive('Valor do pagamento deve ser positivo'),
  valorRecebido: z.number().positive('Valor recebido deve ser positivo').optional(),
  parcelas: z.number().int().min(1).max(12).optional(),
  confirmado: z.boolean().optional(),
});

export const createVendaSchema = z.object({
  itens: z.array(itemVendaSchema).min(1, 'Venda deve ter pelo menos um item'),
  desconto: z.number().min(0).default(0),
  cpf: z.string().trim().max(14).optional(),
  cliente: z.string().trim().max(120).optional(),
  observacao: z.string().trim().max(300).optional(),
  pagamentos: z.array(pagamentoVendaSchema).min(1, 'Informe pelo menos uma forma de pagamento'),
});

export const queryVendaSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateVendaInput = z.infer<typeof createVendaSchema>;
export type QueryVendaInput = z.infer<typeof queryVendaSchema>;
