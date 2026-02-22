import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import type { CreateCategoriaInput, UpdateCategoriaInput } from '../validations/categoria.schema';

export const categoriaService = {
  async list() {
    return prisma.categoria.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { produtos: true } } },
    });
  },

  async getById(id: string) {
    const cat = await prisma.categoria.findUnique({
      where: { id },
      include: { produtos: true },
    });
    if (!cat) throw new AppError(404, 'Categoria não encontrada', 'NOT_FOUND');
    return cat;
  },

  async create(data: CreateCategoriaInput) {
    const exists = await prisma.categoria.findUnique({ where: { nome: data.nome } });
    if (exists) throw new AppError(409, 'Já existe uma categoria com este nome', 'CONFLICT');
    return prisma.categoria.create({ data });
  },

  async update(id: string, data: UpdateCategoriaInput) {
    await this.getById(id);
    if (data.nome) {
      const exists = await prisma.categoria.findFirst({
        where: { nome: data.nome, NOT: { id } },
      });
      if (exists) throw new AppError(409, 'Já existe outra categoria com este nome', 'CONFLICT');
    }
    return prisma.categoria.update({ where: { id }, data });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.categoria.delete({ where: { id } });
  },
};
