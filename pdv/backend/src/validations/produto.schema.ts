import { z } from 'zod';

export const createProdutoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200),
  codigo: z.string().max(50).optional().nullable(),
  preco: z.number().positive('Preço deve ser positivo'),
  estoque: z.number().int().min(0).default(0),
  categoriaId: z.string().uuid().optional().nullable(),
});

export const updateProdutoSchema = createProdutoSchema.partial();

export const queryProdutoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  busca: z.string().max(100).optional(),
  categoriaId: z.string().uuid().optional(),
});

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
export type QueryProdutoInput = z.infer<typeof queryProdutoSchema>;
