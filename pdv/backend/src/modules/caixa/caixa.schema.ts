import { z } from 'zod';

export const abrirCaixaSchema = z.object({
  valorInicial: z.number().min(0, 'Valor inicial deve ser maior ou igual a zero'),
  descricao: z.string().max(300).optional(),
});

export const movimentoCaixaSchema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  motivo: z.string().min(3, 'Motivo obrigatorio').max(300),
  confirmacao: z.boolean().refine((v) => v, 'Confirmacao obrigatoria'),
});

export const fecharCaixaSchema = z.object({
  valorContadoDinheiro: z.number().min(0, 'Valor contado deve ser maior ou igual a zero'),
  justificativa: z.string().max(500).optional(),
});

export const listarMovimentosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AbrirCaixaInput = z.infer<typeof abrirCaixaSchema>;
export type MovimentoCaixaInput = z.infer<typeof movimentoCaixaSchema>;
export type FecharCaixaInput = z.infer<typeof fecharCaixaSchema>;
export type ListarMovimentosInput = z.infer<typeof listarMovimentosSchema>;
