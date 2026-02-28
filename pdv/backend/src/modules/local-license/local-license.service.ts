import { createHash } from 'node:crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';
import type { ChangeLocalLicensePasswordInput, RenewLocalLicenseInput } from './local-license.schema';

type Ctx = { userId?: string; ip?: string; userAgent?: string };

const LOCAL_LICENSE_VALIDITY_DAYS = 40;
const LOCAL_LICENSE_WARNING_DAYS = 7;
const DEFAULT_RENEWAL_PASSWORD = 'RENOVA2024';
const DAY_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + Math.max(1, days) * DAY_MS);
}

function daysRemainingUntil(expiration: Date, now = new Date()): number {
  const diffMs = expiration.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / DAY_MS);
}

async function audit(ctx: Ctx, acao: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: ctx.userId ?? null,
      acao,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}

async function ensureSingleActiveLicense() {
  const active = await prisma.localLicense.findMany({
    where: { ativo: true },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  if (active.length === 0) {
    const now = new Date();
    return prisma.localLicense.create({
      data: {
        ativo: true,
        dataAtivacao: now,
        dataExpiracao: addDays(now, LOCAL_LICENSE_VALIDITY_DAYS),
        senhaRenovacaoHash: sha256(DEFAULT_RENEWAL_PASSWORD),
      },
    });
  }

  if (active.length > 1) {
    const [, ...extra] = active;
    await prisma.localLicense.updateMany({
      where: { id: { in: extra.map((item) => item.id) } },
      data: { ativo: false },
    });
  }

  return active[0];
}

function toPublicStatus(license: {
  id: string;
  ativo: boolean;
  dataAtivacao: Date;
  dataExpiracao: Date;
  ultimaRenovacao: Date | null;
  tentativasBloqueio: number;
  ultimoBloqueioEm: Date | null;
}) {
  const now = new Date();
  const blocked = now.getTime() >= license.dataExpiracao.getTime();
  const daysRemaining = daysRemainingUntil(license.dataExpiracao, now);
  return {
    id: license.id,
    ativo: license.ativo,
    bloqueado: blocked,
    diasRestantes: daysRemaining,
    aviso: !blocked && daysRemaining <= LOCAL_LICENSE_WARNING_DAYS,
    dataAtivacao: license.dataAtivacao.toISOString(),
    dataExpiracao: license.dataExpiracao.toISOString(),
    ultimaRenovacao: license.ultimaRenovacao ? license.ultimaRenovacao.toISOString() : null,
    tentativasBloqueio: license.tentativasBloqueio,
    ultimoBloqueioEm: license.ultimoBloqueioEm ? license.ultimoBloqueioEm.toISOString() : null,
    validadeDias: LOCAL_LICENSE_VALIDITY_DAYS,
    avisoDias: LOCAL_LICENSE_WARNING_DAYS,
  };
}

export const localLicenseService = {
  async status() {
    const license = await ensureSingleActiveLicense();
    return toPublicStatus(license);
  },

  async renew(input: RenewLocalLicenseInput, ctx: Ctx = {}) {
    const license = await ensureSingleActiveLicense();
    const providedHash = sha256(input.senha.trim());

    if (!input.senha.trim() || providedHash !== license.senhaRenovacaoHash) {
      await prisma.localLicense.update({
        where: { id: license.id },
        data: {
          tentativasBloqueio: { increment: 1 },
          ultimoBloqueioEm: new Date(),
        },
      });
      await audit(ctx, 'LOCAL_LICENSE_RENEW_INVALID_PASSWORD');
      throw new AppError(401, 'Senha de renovacao invalida', 'LOCAL_LICENSE_INVALID_PASSWORD');
    }

    const now = new Date();
    const updated = await prisma.localLicense.update({
      where: { id: license.id },
      data: {
        dataExpiracao: addDays(now, LOCAL_LICENSE_VALIDITY_DAYS),
        ultimaRenovacao: now,
        tentativasBloqueio: 0,
        ultimoBloqueioEm: null,
      },
    });
    await audit(ctx, 'LOCAL_LICENSE_RENEWED');
    return toPublicStatus(updated);
  },

  async changePassword(input: ChangeLocalLicensePasswordInput, ctx: Ctx) {
    const license = await ensureSingleActiveLicense();
    const currentHash = sha256(input.senhaAtual.trim());
    if (!input.senhaAtual.trim() || currentHash !== license.senhaRenovacaoHash) {
      await audit(ctx, 'LOCAL_LICENSE_PASSWORD_CHANGE_INVALID_CURRENT');
      throw new AppError(401, 'Senha atual da licenca invalida', 'LOCAL_LICENSE_INVALID_PASSWORD');
    }

    await prisma.localLicense.update({
      where: { id: license.id },
      data: {
        senhaRenovacaoHash: sha256(input.novaSenha.trim()),
      },
    });
    await audit(ctx, 'LOCAL_LICENSE_PASSWORD_CHANGED');
    return { success: true };
  },
};
