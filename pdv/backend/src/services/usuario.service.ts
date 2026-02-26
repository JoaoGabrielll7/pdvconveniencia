import { LicensePlanType, LicenseStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { hashPassword } from '../modules/auth/auth.utils';
import { addDaysToDate, generateLicenseKey, resolveExpiresAtByPlan } from '../utils/license.utils';
import type { CreateUsuarioInput, QueryUsuarioInput, UpdateUsuarioInput } from '../validations/usuario.schema';

const publicUserSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  criadoEm: true,
  ultimoLogin: true,
} satisfies Prisma.UserSelect;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

async function generateUniqueLicenseKey(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateLicenseKey();
    const exists = await tx.license.findUnique({
      where: { licenseKey: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new AppError(500, 'Nao foi possivel gerar uma chave unica de licenca', 'LICENSE_KEY_GENERATION_FAILED');
}

export const usuarioService = {
  async list(query: QueryUsuarioInput) {
    const { page, limit, busca } = query;
    const skip = (page - 1) * limit;
    const term = busca?.trim();
    const where = term
      ? {
          OR: [
            { nome: { contains: term, mode: 'insensitive' as const } },
            { email: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [dados, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
        select: publicUserSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return { dados, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) throw new AppError(404, 'Usuario nao encontrado', 'NOT_FOUND');
    return user;
  },

  async create(data: CreateUsuarioInput) {
    const email = normalizeEmail(data.email);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError(409, 'Ja existe usuario com este e-mail', 'CONFLICT');

    const senhaHash = await hashPassword(data.senha);
    return prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          nome: data.nome.trim(),
          email,
          senhaHash,
          role: data.role,
          ativo: data.ativo ?? true,
        },
        select: publicUserSelect,
      });

      const licensePlanType = data.licensePlanType ?? LicensePlanType.MONTHLY;
      const licenseMaxDevices = data.licenseMaxDevices ?? 1;
      const expiresAt =
        data.licenseValidityDays !== undefined
          ? addDaysToDate(new Date(), data.licenseValidityDays)
          : resolveExpiresAtByPlan(licensePlanType);
      const licenseKey = await generateUniqueLicenseKey(tx);

      const createdLicense = await tx.license.create({
        data: {
          licenseKey,
          userId: createdUser.id,
          planType: licensePlanType,
          maxDevices: licenseMaxDevices,
          status: LicenseStatus.ACTIVE,
          expiresAt,
        },
        select: { id: true },
      });

      await tx.licenseHistory.create({
        data: {
          licenseId: createdLicense.id,
          action: 'CREATED_ON_USER_CREATE',
          performedBy: 'SYSTEM_USER_CREATE',
        },
      });

      return createdUser;
    });
  },

  async update(id: string, data: UpdateUsuarioInput) {
    await this.getById(id);

    if (data.email) {
      const email = normalizeEmail(data.email);
      const duplicate = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });
      if (duplicate) throw new AppError(409, 'Ja existe outro usuario com este e-mail', 'CONFLICT');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.nome !== undefined) updateData.nome = data.nome.trim();
    if (data.email !== undefined) updateData.email = normalizeEmail(data.email);
    if (data.role !== undefined) updateData.role = data.role;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.senha) updateData.senhaHash = await hashPassword(data.senha);

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: publicUserSelect,
    });
  },

  async delete(id: string, actorUserId?: string) {
    if (actorUserId && actorUserId === id) {
      throw new AppError(400, 'Nao e permitido excluir o proprio usuario logado', 'INVALID_OPERATION');
    }

    await this.getById(id);
    try {
      return await prisma.user.delete({ where: { id }, select: publicUserSelect });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new AppError(409, 'Usuario vinculado a operacoes. Nao e possivel excluir.', 'CONFLICT');
      }
      throw error;
    }
  },
};
