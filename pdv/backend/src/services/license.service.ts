import { LicensePlanType, LicenseStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { licenseRepository } from '../repositories/license.repository';
import type { AddDaysInput, ChangePlanInput, CreateLicenseInput, ListLicensesQuery, RemoveDaysInput, ValidateLicenseInput } from '../validators/license.validator';
import {
  addDaysToDate,
  buildValidationResponse,
  generateLicenseKey,
  hashDeviceId,
  isExpired,
  resolveExpiresAtByPlan,
  signLicenseValidationToken,
  subtractDaysFromDate,
} from '../utils/license.utils';

type Actor = { userId?: string; role?: string };

function actorLabel(actor?: Actor): string {
  return actor?.userId ?? 'SYSTEM';
}

async function ensureUniqueLicenseKey(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateLicenseKey();
    const exists = await licenseRepository.licenseKeyExists(candidate);
    if (!exists) return candidate;
  }
  throw new AppError(500, 'Nao foi possivel gerar uma chave unica', 'LICENSE_KEY_GENERATION_FAILED');
}

async function ensureLicenseExists(id: string) {
  const license = await licenseRepository.findById(id, {
    include: { user: { select: { id: true, nome: true, email: true, role: true } } },
  });
  if (!license) throw new AppError(404, 'Licenca nao encontrada', 'NOT_FOUND');
  return license;
}

export const licenseService = {
  async create(input: CreateLicenseInput, actor?: Actor) {
    const user = await licenseRepository.findUserById(input.userId);
    if (!user || !user.ativo) {
      throw new AppError(404, 'Usuario nao encontrado para a licenca', 'NOT_FOUND');
    }

    const licenseKey = await ensureUniqueLicenseKey();
    const expiresAt =
      input.validityDays !== undefined
        ? addDaysToDate(new Date(), input.validityDays)
        : resolveExpiresAtByPlan(input.planType);

    const created = await prisma.$transaction(async (tx) => {
      const license = await tx.license.create({
        data: {
          licenseKey,
          userId: user.id,
          planType: input.planType,
          maxDevices: input.maxDevices,
          status: LicenseStatus.ACTIVE,
          expiresAt,
        },
        include: {
          user: { select: { id: true, nome: true, email: true, role: true } },
        },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: license.id,
          action: 'CREATED',
          performedBy: actorLabel(actor),
        },
      });
      return license;
    });

    return created;
  },

  async list(query: ListLicensesQuery) {
    const data = await licenseRepository.list(query);
    return {
      ...data,
      limit: query.limit,
      offset: query.offset,
    };
  },

  async getById(id: string) {
    return ensureLicenseExists(id);
  },

  async validate(input: ValidateLicenseInput) {
    const license = await licenseRepository.findByKey(input.licenseKey.trim(), {
      include: { user: { select: { id: true, nome: true, email: true, role: true } } },
    });

    if (!license) {
      return buildValidationResponse({
        valid: false,
        status: 'NOT_FOUND',
        expiresAt: null,
        message: 'Licenca nao encontrada',
      });
    }

    if (license.status === LicenseStatus.BLOCKED) {
      return buildValidationResponse({
        valid: false,
        status: LicenseStatus.BLOCKED,
        expiresAt: license.expiresAt,
        message: 'Licenca bloqueada manualmente',
      });
    }

    if (license.status === LicenseStatus.EXPIRED || isExpired(license.expiresAt)) {
      if (license.status !== LicenseStatus.EXPIRED) {
        await prisma.$transaction(async (tx) => {
          await tx.license.update({
            where: { id: license.id },
            data: { status: LicenseStatus.EXPIRED },
          });
          await tx.licenseHistory.create({
            data: {
              licenseId: license.id,
              action: 'AUTO_EXPIRED_ON_VALIDATE',
              performedBy: 'SYSTEM',
            },
          });
        });
      }
      return buildValidationResponse({
        valid: false,
        status: LicenseStatus.EXPIRED,
        expiresAt: license.expiresAt,
        message: 'Licenca expirada',
      });
    }

    const deviceHash = hashDeviceId(input.deviceId.trim());
    const existingActivation = await licenseRepository.findActivation(license.id, deviceHash);

    if (!existingActivation) {
      const activeDevices = await licenseRepository.countActivations(license.id);
      if (activeDevices >= license.maxDevices) {
        return buildValidationResponse({
          valid: false,
          status: 'MAX_DEVICES_REACHED',
          expiresAt: license.expiresAt,
          message: 'Limite de dispositivos atingido para esta licenca',
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.licenseActivation.create({
          data: {
            licenseId: license.id,
            deviceId: deviceHash,
          },
        });
        await tx.licenseHistory.create({
          data: {
            licenseId: license.id,
            action: 'DEVICE_ACTIVATED',
            performedBy: license.userId,
          },
        });
      });
    } else {
      await licenseRepository.updateActivationLastCheck(existingActivation.id);
    }

    const validationToken = signLicenseValidationToken({
      licenseId: license.id,
      licenseKey: license.licenseKey,
      userId: license.userId,
      deviceHash,
      status: LicenseStatus.ACTIVE,
    });

    return buildValidationResponse({
      valid: true,
      status: LicenseStatus.ACTIVE,
      expiresAt: license.expiresAt,
      message: 'Licenca validada com sucesso',
      validationToken,
    });
  },

  async block(id: string, actor?: Actor) {
    await ensureLicenseExists(id);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id },
        data: { status: LicenseStatus.BLOCKED },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: 'BLOCKED',
          performedBy: actorLabel(actor),
        },
      });
      return updated;
    });
  },

  async activate(id: string, actor?: Actor) {
    const current = await ensureLicenseExists(id);
    if (isExpired(current.expiresAt)) {
      throw new AppError(409, 'Licenca expirada. Adicione dias antes de ativar', 'LICENSE_EXPIRED');
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id },
        data: { status: LicenseStatus.ACTIVE },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: 'ACTIVATED',
          performedBy: actorLabel(actor),
        },
      });
      return updated;
    });
  },

  async expire(id: string, actor?: Actor) {
    await ensureLicenseExists(id);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id },
        data: {
          status: LicenseStatus.EXPIRED,
          expiresAt: new Date(),
        },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: 'EXPIRED_MANUAL',
          performedBy: actorLabel(actor),
        },
      });
      return updated;
    });
  },

  async addDays(id: string, input: AddDaysInput, actor?: Actor) {
    const current = await ensureLicenseExists(id);
    const baseDate = current.expiresAt && current.expiresAt > new Date() ? current.expiresAt : new Date();
    const expiresAt = addDaysToDate(baseDate, input.days);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id },
        data: {
          expiresAt,
          status: LicenseStatus.ACTIVE,
        },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: `DAYS_ADDED_${input.days}`,
          performedBy: actorLabel(actor),
        },
      });
      return updated;
    });
  },

  async removeDays(id: string, input: RemoveDaysInput, actor?: Actor) {
    const current = await ensureLicenseExists(id);
    if (!current.expiresAt) {
      throw new AppError(409, 'Licenca vitalicia nao permite remover dias', 'INVALID_OPERATION');
    }

    const expiresAt = subtractDaysFromDate(current.expiresAt, input.days);
    const now = new Date();
    const status =
      expiresAt <= now
        ? LicenseStatus.EXPIRED
        : current.status === LicenseStatus.BLOCKED
          ? LicenseStatus.BLOCKED
          : LicenseStatus.ACTIVE;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id },
        data: {
          expiresAt,
          status,
        },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: `DAYS_REMOVED_${input.days}`,
          performedBy: actorLabel(actor),
        },
      });
      return updated;
    });
  },

  async changePlan(id: string, input: ChangePlanInput, actor?: Actor) {
    await ensureLicenseExists(id);
    const expiresAt = resolveExpiresAtByPlan(input.planType);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.license.update({
        where: { id },
        data: {
          planType: input.planType,
          maxDevices: input.maxDevices ?? undefined,
          expiresAt,
          status: expiresAt && expiresAt < new Date() ? LicenseStatus.EXPIRED : LicenseStatus.ACTIVE,
        },
      });
      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: `PLAN_CHANGED_${input.planType}`,
          performedBy: actorLabel(actor),
        },
      });
      return updated;
    });
  },

  async delete(id: string, actor?: Actor) {
    const current = await ensureLicenseExists(id);
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId: actor?.userId ?? null,
          acao: `LICENSE_DELETED:${current.licenseKey}`,
        },
      });
      await tx.licenseActivation.deleteMany({ where: { licenseId: id } });
      await tx.licenseHistory.deleteMany({ where: { licenseId: id } });
      await tx.license.delete({ where: { id } });
    });
    return { id };
  },

  async history(id: string) {
    const [license, history] = await Promise.all([
      ensureLicenseExists(id),
      licenseRepository.listHistory(id),
    ]);
    return { license, history };
  },

  async activations(id: string) {
    const [license, activations] = await Promise.all([
      ensureLicenseExists(id),
      licenseRepository.listActivations(id),
    ]);
    return { license, activations };
  },

  async currentByUser(userId: string) {
    const [license, user] = await Promise.all([
      licenseRepository.findLatestByUser(userId),
      licenseRepository.findUserById(userId),
    ]);
    if (license) return license;

    if (user && user.ativo && user.role === 'ADMIN') {
      return this.create(
        { userId: user.id, planType: LicensePlanType.LIFETIME, maxDevices: 100 },
        { userId: 'SYSTEM' }
      );
    }

    throw new AppError(404, 'Licenca do usuario nao encontrada', 'NOT_FOUND');
  },

  async expireOutdatedLicenses(): Promise<number> {
    const count = await licenseRepository.expireOutdated(new Date());
    if (count > 0) {
      const expired = await prisma.license.findMany({
        where: {
          status: LicenseStatus.EXPIRED,
          updatedAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
        },
        select: { id: true },
      });
      await prisma.licenseHistory.createMany({
        data: expired.map((item) => ({
          licenseId: item.id,
          action: 'AUTO_EXPIRED_DAILY',
          performedBy: 'SYSTEM_CRON',
        })),
        skipDuplicates: true,
      });
    }
    return count;
  },
};
