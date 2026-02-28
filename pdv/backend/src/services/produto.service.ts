import { Prisma } from '@prisma/client';
import { appCache } from '../cache/app-cache';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import type {
  CreateProdutoInput,
  QueryProdutoInput,
  UpdateProdutoInput,
} from '../validations/produto.schema';

const PRODUCT_LIST_CACHE_PREFIX = 'produtos:list:';

export const produtoService = {
  async list(query: QueryProdutoInput) {
    const { page, limit, busca, categoriaId } = query;
    const skip = (page - 1) * limit;
    const cacheKey = `${PRODUCT_LIST_CACHE_PREFIX}${JSON.stringify({
      page,
      limit,
      busca: busca ?? '',
      categoriaId: categoriaId ?? '',
    })}`;

    const cached = appCache.get<{
      dados: unknown[];
      total: number;
      page: number;
      totalPages: number;
    }>(cacheKey);
    if (cached) return cached;

    const where = {
      ...(busca && {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' as const } },
          { codigo: { contains: busca, mode: 'insensitive' as const } },
        ],
      }),
      ...(categoriaId && { categoriaId }),
    };

    const [produtos, total] = await Promise.all([
      prisma.produto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
        include: { categoria: { select: { id: true, nome: true } } },
      }),
      prisma.produto.count({ where }),
    ]);

    const payload = { dados: produtos, total, page, totalPages: Math.ceil(total / limit) };
    appCache.set(cacheKey, payload, env.cacheTtlSeconds * 1000);
    return payload;
  },

  async getById(id: string) {
    const produto = await prisma.produto.findUnique({
      where: { id },
      include: { categoria: true },
    });
    if (!produto) throw new AppError(404, 'Produto nao encontrado', 'NOT_FOUND');
    return produto;
  },

  async create(data: CreateProdutoInput) {
    if (data.codigo) {
      const exists = await prisma.produto.findUnique({ where: { codigo: data.codigo } });
      if (exists) throw new AppError(409, 'Ja existe produto com este codigo', 'CONFLICT');
    }
    const created = await prisma.produto.create({
      data: {
        ...data,
        categoriaId: data.categoriaId ?? undefined,
      },
      include: { categoria: true },
    });
    appCache.clearPrefix(PRODUCT_LIST_CACHE_PREFIX);
    return created;
  },

  async update(id: string, data: UpdateProdutoInput) {
    await this.getById(id);
    if (data.codigo) {
      const exists = await prisma.produto.findFirst({
        where: { codigo: data.codigo, NOT: { id } },
      });
      if (exists) throw new AppError(409, 'Ja existe outro produto com este codigo', 'CONFLICT');
    }
    const updated = await prisma.produto.update({
      where: { id },
      data: { ...data, categoriaId: data.categoriaId ?? undefined },
      include: { categoria: true },
    });
    appCache.clearPrefix(PRODUCT_LIST_CACHE_PREFIX);
    return updated;
  },

  async delete(id: string) {
    await this.getById(id);
    try {
      const deleted = await prisma.$transaction(async (tx) => {
        await tx.itemVenda.deleteMany({ where: { produtoId: id } });
        return tx.produto.delete({ where: { id } });
      });
      appCache.clearPrefix(PRODUCT_LIST_CACHE_PREFIX);
      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new AppError(409, 'Produto vinculado a vendas. Nao e possivel excluir definitivamente.', 'CONFLICT');
      }
      throw error;
    }
  },
};
