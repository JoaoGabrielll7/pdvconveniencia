import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import type { CreateFornecedorInput, QueryFornecedorInput, UpdateFornecedorInput } from '../validations/fornecedor.schema';

function normalizeOptional(value?: string | null): string | null {
  const next = (value ?? '').trim();
  return next.length > 0 ? next : null;
}

export const fornecedorService = {
  async list(query: QueryFornecedorInput) {
    const { page, limit, busca } = query;
    const skip = (page - 1) * limit;
    const term = busca?.trim();
    const where = term
      ? {
          OR: [
            { nome: { contains: term, mode: 'insensitive' as const } },
            { email: { contains: term, mode: 'insensitive' as const } },
            { telefone: { contains: term, mode: 'insensitive' as const } },
            { cnpj: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [dados, total] = await Promise.all([
      prisma.fornecedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      prisma.fornecedor.count({ where }),
    ]);

    return { dados, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async getById(id: string) {
    const fornecedor = await prisma.fornecedor.findUnique({ where: { id } });
    if (!fornecedor) throw new AppError(404, 'Fornecedor nao encontrado', 'NOT_FOUND');
    return fornecedor;
  },

  async create(data: CreateFornecedorInput) {
    return prisma.fornecedor.create({
      data: {
        nome: data.nome.trim(),
        cnpj: normalizeOptional(data.cnpj),
        email: normalizeOptional(data.email),
        telefone: normalizeOptional(data.telefone),
        endereco: normalizeOptional(data.endereco),
      },
    });
  },

  async update(id: string, data: UpdateFornecedorInput) {
    await this.getById(id);
    return prisma.fornecedor.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.cnpj !== undefined ? { cnpj: normalizeOptional(data.cnpj) } : {}),
        ...(data.email !== undefined ? { email: normalizeOptional(data.email) } : {}),
        ...(data.telefone !== undefined ? { telefone: normalizeOptional(data.telefone) } : {}),
        ...(data.endereco !== undefined ? { endereco: normalizeOptional(data.endereco) } : {}),
      },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.fornecedor.delete({ where: { id } });
  },
};
