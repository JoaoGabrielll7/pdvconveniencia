import fs from 'node:fs/promises';
import path from 'node:path';
import { LicensePlanType, LicenseStatus as DbLicenseStatus } from '@prisma/client';
import { appCache } from '../../cache/app-cache';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';
import { generateLicenseKey } from '../../utils/license.utils';

type Ctx = { userId?: string; ip?: string; userAgent?: string };
type LegacyLicenseStatus = 'ATIVA' | 'EXPIRADA' | 'BLOQUEADA';

type LicenseRecord = {
  id: string;
  key: string;
  owner: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  status: LegacyLicenseStatus;
  createdAt: string;
  expiresAt: string;
  notes?: string;
};

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const DAY_MS = 24 * 60 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function parseExpiresAt(expiresAt?: string, days?: number): Date {
  if (typeof expiresAt === 'string' && expiresAt.trim()) {
    const raw = expiresAt.trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T23:59:59.999`)
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(400, 'Data de validade invalida', 'INVALID_EXPIRES_AT');
    }
    if (parsed.getTime() <= Date.now()) {
      throw new AppError(400, 'A validade da licenca deve estar no futuro', 'INVALID_EXPIRES_AT');
    }
    return parsed;
  }

  const safeDays = Number(days ?? 30);
  if (!Number.isFinite(safeDays) || safeDays < 1 || safeDays > 3650) {
    throw new AppError(400, 'Periodo de licenca invalido', 'INVALID_LICENSE_DAYS');
  }
  return new Date(Date.now() + Math.max(1, safeDays) * DAY_MS);
}

function toLegacyStatus(status: DbLicenseStatus): LegacyLicenseStatus {
  if (status === DbLicenseStatus.BLOCKED) return 'BLOQUEADA';
  if (status === DbLicenseStatus.EXPIRED) return 'EXPIRADA';
  return 'ATIVA';
}

function toDbStatus(status: LegacyLicenseStatus): DbLicenseStatus {
  if (status === 'BLOQUEADA') return DbLicenseStatus.BLOCKED;
  if (status === 'EXPIRADA') return DbLicenseStatus.EXPIRED;
  return DbLicenseStatus.ACTIVE;
}

function toLegacyRecord(item: {
  id: string;
  licenseKey: string;
  status: DbLicenseStatus;
  createdAt: Date;
  expiresAt: Date | null;
  userId: string;
  user: { nome: string; email: string };
}): LicenseRecord {
  return {
    id: item.id,
    key: item.licenseKey,
    owner: item.user.nome || 'Usuario',
    userId: item.userId,
    userName: item.user.nome || null,
    userEmail: item.user.email || null,
    status: toLegacyStatus(item.status),
    createdAt: item.createdAt.toISOString(),
    expiresAt: (item.expiresAt ?? new Date('2999-12-31T23:59:59.999Z')).toISOString(),
  };
}

async function ensureStorage(): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.mkdir(env.backupDir, { recursive: true });
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function ensureUniqueDbLicenseKey(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const key = generateLicenseKey();
    const exists = await prisma.license.findUnique({ where: { licenseKey: key }, select: { id: true } });
    if (!exists) return key;
  }
  throw new AppError(500, 'Nao foi possivel gerar chave unica de licenca', 'LICENSE_KEY_GENERATION_FAILED');
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

export const systemService = {
  async listLicenses() {
    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { nome: true, email: true } },
      },
    });
    const dados = licenses.map((item) => toLegacyRecord(item));
    return {
      dados,
      total: dados.length,
      ativas: dados.filter((item) => item.status === 'ATIVA').length,
      expiradas: dados.filter((item) => item.status === 'EXPIRADA').length,
      bloqueadas: dados.filter((item) => item.status === 'BLOQUEADA').length,
    };
  },

  async renewLicense(ctx: Ctx, args?: { owner?: string; dias?: number; userId?: string; expiresAt?: string }) {
    const userId = args?.userId?.trim() || null;
    if (!userId) {
      throw new AppError(400, 'Selecione um usuario para a licenca', 'LICENSE_USER_REQUIRED');
    }
    const expiresAt = parseExpiresAt(args?.expiresAt, args?.dias);
    const assignedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, ativo: true },
    });
    if (!assignedUser || !assignedUser.ativo) {
      throw new AppError(404, 'Usuario para licenca nao encontrado', 'NOT_FOUND');
    }

    const latest = await prisma.license.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { planType: true, maxDevices: true },
    });
    const key = await ensureUniqueDbLicenseKey();

    const created = await prisma.$transaction(async (tx) => {
      await tx.license.updateMany({
        where: { userId, status: DbLicenseStatus.ACTIVE },
        data: { status: DbLicenseStatus.EXPIRED },
      });

      const license = await tx.license.create({
        data: {
          licenseKey: key,
          userId,
          status: DbLicenseStatus.ACTIVE,
          planType: latest?.planType ?? LicensePlanType.MONTHLY,
          maxDevices: latest?.maxDevices ?? 1,
          expiresAt,
        },
        include: {
          user: { select: { nome: true, email: true } },
        },
      });

      await tx.licenseHistory.create({
        data: {
          licenseId: license.id,
          action: 'RENEWED_BY_SYSTEM_MODULE',
          performedBy: ctx.userId ?? 'SYSTEM',
        },
      });

      return license;
    });

    await audit(ctx, 'LICENCA_RENOVADA');
    return toLegacyRecord(created);
  },

  async updateLicenseStatus(id: string, status: LegacyLicenseStatus, ctx: Ctx) {
    const current = await prisma.license.findUnique({
      where: { id },
      include: {
        user: { select: { nome: true, email: true } },
      },
    });
    if (!current) throw new AppError(404, 'Licenca nao encontrada', 'NOT_FOUND');

    const dbStatus = toDbStatus(status);
    const now = new Date();
    if (dbStatus === DbLicenseStatus.ACTIVE && current.expiresAt && current.expiresAt <= now) {
      throw new AppError(409, 'Licenca expirada. Adicione dias antes de ativar', 'LICENSE_EXPIRED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (dbStatus === DbLicenseStatus.ACTIVE) {
        await tx.license.updateMany({
          where: {
            userId: current.userId,
            status: DbLicenseStatus.ACTIVE,
            id: { not: current.id },
          },
          data: { status: DbLicenseStatus.EXPIRED },
        });
      }

      const record = await tx.license.update({
        where: { id },
        data: {
          status: dbStatus,
          ...(dbStatus === DbLicenseStatus.EXPIRED ? { expiresAt: now } : {}),
        },
        include: {
          user: { select: { nome: true, email: true } },
        },
      });

      await tx.licenseHistory.create({
        data: {
          licenseId: id,
          action: `STATUS_CHANGED_${dbStatus}`,
          performedBy: ctx.userId ?? 'SYSTEM',
        },
      });

      return record;
    });

    await audit(ctx, `LICENCA_STATUS_${status}`);
    return toLegacyRecord(updated);
  },

  async createBackup(ctx: Ctx) {
    await ensureStorage();
    const [users, categorias, fornecedores, produtos, caixas, movimentos, vendas, itens, pagamentos] = await Promise.all([
      prisma.user.findMany(),
      prisma.categoria.findMany(),
      prisma.fornecedor.findMany(),
      prisma.produto.findMany(),
      prisma.caixa.findMany(),
      prisma.caixaMovimento.findMany(),
      prisma.venda.findMany(),
      prisma.itemVenda.findMany(),
      prisma.payment.findMany(),
    ]);

    const snapshot = {
      version: 1,
      createdAt: nowIso(),
      data: {
        users,
        categorias,
        fornecedores,
        produtos,
        caixas,
        movimentos,
        vendas,
        itens,
        pagamentos,
      },
    };

    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+$/, '')
      .replace('T', '-');
    const fileName = `backup-${stamp}.json`;
    const fullPath = path.join(env.backupDir, fileName);
    await writeJsonFile(fullPath, snapshot);
    await audit(ctx, 'BACKUP_CRIADO');
    return { fileName, fullPath, createdAt: snapshot.createdAt };
  },

  async listBackupFiles() {
    await ensureStorage();
    const files = await fs.readdir(env.backupDir).catch(() => []);
    const items = await Promise.all(
      files
        .filter((name) => name.toLowerCase().endsWith('.json'))
        .map(async (fileName) => {
          const fullPath = path.join(env.backupDir, fileName);
          const stat = await fs.stat(fullPath);
          return {
            fileName,
            createdAt: stat.birthtime.toISOString(),
            sizeBytes: stat.size,
          };
        })
    );
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async listTodayLogs(limit: number) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), 500) : 120;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const logs = await prisma.auditLog.findMany({
      where: { criadoEm: { gte: from, lte: to } },
      orderBy: { criadoEm: 'desc' },
      take: safeLimit,
      include: {
        user: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });
    return {
      data: logs,
      periodo: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    };
  },

  async clearCache(ctx: Ctx) {
    const now = new Date();
    const appCacheEntries = appCache.clear();
    const [tokenBlacklist, refreshTokens, resetTokens] = await Promise.all([
      prisma.tokenBlacklist.deleteMany({ where: { expiraEm: { lt: now } } }),
      prisma.refreshToken.deleteMany({ where: { expiraEm: { lt: now } } }),
      prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiraEm: { lt: now } },
            { usadoEm: { not: null } },
          ],
        },
      }),
    ]);
    await audit(ctx, 'CACHE_LIMPO');
    return {
      appCacheEntries,
      tokenBlacklistRemovidos: tokenBlacklist.count,
      refreshTokensRemovidos: refreshTokens.count,
      resetTokensRemovidos: resetTokens.count,
    };
  },

  securityCheck() {
    const checks = [
      {
        id: 'jwt_secret',
        ok: env.jwtSecret.length >= 24 && !/secret|dev|123/i.test(env.jwtSecret),
        message: 'JWT_SECRET forte',
      },
      {
        id: 'cors_origin',
        ok: env.corsOrigin !== '*',
        message: 'CORS com origem especifica',
      },
      {
        id: 'rate_limit',
        ok: env.globalRateLimitPerMinute > 0,
        message: 'Rate limit global ativo',
      },
      {
        id: 'session_timeout',
        ok: env.sessionInactivityMinutes > 0 && env.sessionInactivityMinutes <= 1440,
        message: 'Timeout de sessao configurado',
      },
      {
        id: 'cookie_secure',
        ok: env.nodeEnv !== 'production' || env.cookieSecure,
        message: 'Cookie seguro no ambiente de producao',
      },
    ];
    return {
      ok: checks.every((item) => item.ok),
      checks,
      config: {
        nodeEnv: env.nodeEnv,
        globalRateLimitPerMinute: env.globalRateLimitPerMinute,
        sessionInactivityMinutes: env.sessionInactivityMinutes,
      },
    };
  },
};
