import { z } from 'zod';

export const createCategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
});

export const updateCategoriaSchema = createCategoriaSchema.partial();

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;
