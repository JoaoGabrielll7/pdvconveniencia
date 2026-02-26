import { z } from 'zod';

export const queryFornecedorSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  busca: z.string().max(120).optional(),
});

export const createFornecedorSchema = z.object({
  nome: z.string().trim().min(1, 'Nome e obrigatorio').max(200),
  cnpj: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email('E-mail invalido').max(200).optional().nullable(),
  telefone: z.string().trim().max(40).optional().nullable(),
  endereco: z.string().trim().max(255).optional().nullable(),
});

export const updateFornecedorSchema = createFornecedorSchema.partial();

export type QueryFornecedorInput = z.infer<typeof queryFornecedorSchema>;
export type CreateFornecedorInput = z.infer<typeof createFornecedorSchema>;
export type UpdateFornecedorInput = z.infer<typeof updateFornecedorSchema>;
