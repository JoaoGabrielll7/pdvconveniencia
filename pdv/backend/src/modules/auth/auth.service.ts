import { LicensePlanType, LicenseStatus, Role, type Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';
import { hashPassword, hashToken, randomOpaqueToken, signAccessToken, verifyPassword } from './auth.utils';
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, ResetPasswordInput, UpdateMeInput } from './auth.schema';

const INVALID_AUTH_MESSAGE = 'Credenciais invalidas';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

type AuthContext = { ip?: string; userAgent?: string };

function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

function passwordResetExpiryDate(): Date {
  return new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);
}

function toPublicUser(user: { id: string; nome: string; email: string; role: Role; ativo: boolean }) {
  return { id: user.id, nome: user.nome, email: user.email, role: user.role, ativo: user.ativo };
}

async function createUniqueLicenseKey(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const raw = randomOpaqueToken(12).toUpperCase();
    const key = `LIC-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    const exists = await prisma.license.findUnique({
      where: { licenseKey: key },
      select: { id: true },
    });
    if (!exists) return key;
  }
  throw new AppError(500, 'Falha ao gerar chave de licenca para administrador', 'LICENSE_KEY_GENERATION_FAILED');
}

async function findCurrentLicenseKey(userId: string, role: Role): Promise<string | null> {
  const now = new Date();
  const active = await prisma.license.findFirst({
    where: {
      userId,
      status: LicenseStatus.ACTIVE,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: now } },
      ],
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: { licenseKey: true },
  });
  if (active?.licenseKey) return active.licenseKey;

  if (role !== Role.ADMIN) return null;

  const licenseKey = await createUniqueLicenseKey();
  await prisma.$transaction(async (tx) => {
    const created = await tx.license.create({
      data: {
        licenseKey,
        userId,
        status: LicenseStatus.ACTIVE,
        planType: LicensePlanType.LIFETIME,
        maxDevices: 100,
        expiresAt: null,
      },
    });
    await tx.licenseHistory.create({
      data: {
        licenseId: created.id,
        action: 'AUTO_CREATED_ADMIN_LICENSE',
        performedBy: 'SYSTEM',
      },
    });
  });

  return licenseKey;
}

export const authService = {
  refreshCookieName: REFRESH_TOKEN_COOKIE,

  refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: env.cookieSecure || env.nodeEnv === 'production',
      sameSite: 'strict' as const,
      path: '/api/auth',
      maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    };
  },

  async logAudit(args: { userId?: string | null; acao: string; ip?: string; userAgent?: string }) {
    await prisma.auditLog.create({
      data: {
        userId: args.userId ?? null,
        acao: args.acao,
        ip: args.ip,
        userAgent: args.userAgent,
      },
    });
  },

  async issueSession(user: { id: string; role: Role }, ctx: AuthContext, oldRefreshTokenId?: string) {
    const refreshToken = randomOpaqueToken(64);
    const refreshTokenHash = hashToken(refreshToken);
    const access = signAccessToken({ userId: user.id, role: user.role });

    const created = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiraEm: refreshExpiryDate(),
        substituidoPorId: oldRefreshTokenId ?? null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
      select: { id: true },
    });

    return {
      accessToken: access.token,
      accessTokenExpiraEm: access.exp,
      refreshToken,
      refreshTokenId: created.id,
    };
  },

  async login(data: LoginInput, ctx: AuthContext) {
    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.ativo) {
      await this.logAudit({ userId: user?.id, acao: 'LOGIN_FALHA_CREDENCIAL', ip: ctx.ip, userAgent: ctx.userAgent });
      throw new AppError(401, INVALID_AUTH_MESSAGE, 'UNAUTHORIZED');
    }

    const now = new Date();
    if (user.bloqueadoAte && user.bloqueadoAte > now) {
      await this.logAudit({ userId: user.id, acao: 'LOGIN_FALHA_BLOQUEIO', ip: ctx.ip, userAgent: ctx.userAgent });
      throw new AppError(429, 'Conta temporariamente bloqueada. Tente novamente mais tarde.', 'ACCOUNT_LOCKED');
    }

    const valid = await verifyPassword(data.senha, user.senhaHash);
    if (!valid) {
      const attempts = user.tentativasLogin + 1;
      const shouldLock = attempts >= env.loginMaxAttempts;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          tentativasLogin: shouldLock ? 0 : attempts,
          bloqueadoAte: shouldLock ? new Date(Date.now() + env.loginBlockMinutes * 60 * 1000) : null,
        },
      });
      await this.logAudit({ userId: user.id, acao: shouldLock ? 'LOGIN_FALHA_BLOQUEADO' : 'LOGIN_FALHA_SENHA', ip: ctx.ip, userAgent: ctx.userAgent });
      throw new AppError(401, INVALID_AUTH_MESSAGE, 'UNAUTHORIZED');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { tentativasLogin: 0, bloqueadoAte: null, ultimoLogin: now },
    });
    const session = await this.issueSession(user, ctx);
    await this.logAudit({ userId: user.id, acao: 'LOGIN_SUCESSO', ip: ctx.ip, userAgent: ctx.userAgent });

    return {
      user: toPublicUser(user),
      accessToken: session.accessToken,
      accessTokenExpiraEm: session.accessTokenExpiraEm,
      refreshToken: session.refreshToken,
      licenseKey: await findCurrentLicenseKey(user.id, user.role),
    };
  },

  async refresh(refreshTokenRaw: string, ctx: AuthContext) {
    if (!refreshTokenRaw) throw new AppError(401, 'Sessao invalida', 'UNAUTHORIZED');
    const tokenHash = hashToken(refreshTokenRaw);
    const found = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!found || found.revogado || found.expiraEm <= new Date()) {
      throw new AppError(401, 'Sessao invalida', 'UNAUTHORIZED');
    }
    if (!found.user.ativo) throw new AppError(401, 'Usuario inativo', 'UNAUTHORIZED');

    const now = new Date();
    const inactivityMs = env.sessionInactivityMinutes * 60 * 1000;
    if (found.user.ultimoLogin && now.getTime() - found.user.ultimoLogin.getTime() > inactivityMs) {
      await prisma.refreshToken.updateMany({
        where: { userId: found.user.id, revogado: false },
        data: { revogado: true, revogadoEm: now, revogadoMotivo: 'INACTIVITY_TIMEOUT' },
      });
      await this.logAudit({ userId: found.user.id, acao: 'REFRESH_FALHA_INATIVIDADE', ip: ctx.ip, userAgent: ctx.userAgent });
      throw new AppError(401, 'Sessao expirada por inatividade', 'SESSION_EXPIRED');
    }

    const next = await this.issueSession(found.user, ctx, found.id);
    await prisma.refreshToken.update({
      where: { id: found.id },
      data: { revogado: true, revogadoEm: now, revogadoMotivo: 'ROTATED', substituidoPorId: next.refreshTokenId },
    });
    await prisma.user.update({ where: { id: found.user.id }, data: { ultimoLogin: now } });
    await this.logAudit({ userId: found.user.id, acao: 'REFRESH_SUCESSO', ip: ctx.ip, userAgent: ctx.userAgent });

    return {
      user: toPublicUser(found.user),
      accessToken: next.accessToken,
      accessTokenExpiraEm: next.accessTokenExpiraEm,
      refreshToken: next.refreshToken,
      licenseKey: await findCurrentLicenseKey(found.user.id, found.user.role),
    };
  },

  async logout(args: { userId?: string; accessToken?: string; refreshToken?: string; ip?: string; userAgent?: string }) {
    const now = new Date();
    if (args.refreshToken) {
      const hash = hashToken(args.refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hash, revogado: false },
        data: { revogado: true, revogadoEm: now, revogadoMotivo: 'LOGOUT' },
      });
    }

    if (args.accessToken) {
      await prisma.tokenBlacklist.create({
        data: {
          tokenHash: hashToken(args.accessToken),
          expiraEm: new Date(Date.now() + env.accessTokenTtlMinutes * 60 * 1000),
        },
      }).catch(() => undefined);
    }

    await this.logAudit({ userId: args.userId, acao: 'LOGOUT', ip: args.ip, userAgent: args.userAgent });
  },

  async forgotPassword(data: ForgotPasswordInput, ctx: AuthContext) {
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
    if (user && user.ativo) {
      const rawToken = randomOpaqueToken(32);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiraEm: passwordResetExpiryDate(),
        },
      });
      await this.logAudit({ userId: user.id, acao: 'PASSWORD_RESET_REQUEST', ip: ctx.ip, userAgent: ctx.userAgent });
      return { token: rawToken };
    }
    return { token: null };
  },

  async resetPassword(data: ResetPasswordInput, ctx: AuthContext) {
    const tokenHash = hashToken(data.token);
    const reset = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!reset || reset.usadoEm || reset.expiraEm <= new Date() || !reset.user.ativo) {
      throw new AppError(400, 'Token de recuperacao invalido ou expirado', 'INVALID_RESET_TOKEN');
    }
    const senhaHash = await hashPassword(data.novaSenha);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { senhaHash, tentativasLogin: 0, bloqueadoAte: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usadoEm: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revogado: false },
        data: { revogado: true, revogadoEm: new Date(), revogadoMotivo: 'PASSWORD_RESET' },
      }),
    ] as Prisma.PrismaPromise<unknown>[]);
    await this.logAudit({ userId: reset.userId, acao: 'PASSWORD_RESET_SUCCESS', ip: ctx.ip, userAgent: ctx.userAgent });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ativo) throw new AppError(404, 'Usuario nao encontrado', 'NOT_FOUND');
    return toPublicUser(user);
  },

  async updateMe(userId: string, data: UpdateMeInput, ctx: AuthContext) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current || !current.ativo) throw new AppError(404, 'Usuario nao encontrado', 'NOT_FOUND');

    const nextEmail = data.email.toLowerCase().trim();
    if (nextEmail !== current.email) {
      const duplicated = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (duplicated && duplicated.id !== userId) {
        throw new AppError(409, 'Ja existe outro usuario com este e-mail', 'CONFLICT');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        nome: data.nome.trim(),
        email: nextEmail,
      },
    });
    await this.logAudit({
      userId,
      acao: 'PERFIL_ATUALIZADO',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return toPublicUser(updated);
  },

  async changePassword(userId: string, data: ChangePasswordInput, ctx: AuthContext) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ativo) throw new AppError(404, 'Usuario nao encontrado', 'NOT_FOUND');

    const senhaAtualOk = await verifyPassword(data.senhaAtual, user.senhaHash);
    if (!senhaAtualOk) throw new AppError(400, 'Senha atual incorreta', 'INVALID_PASSWORD');

    const novaSenhaIgual = await verifyPassword(data.novaSenha, user.senhaHash);
    if (novaSenhaIgual) throw new AppError(400, 'A nova senha deve ser diferente da senha atual', 'INVALID_PASSWORD');

    const senhaHash = await hashPassword(data.novaSenha);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          senhaHash,
          tentativasLogin: 0,
          bloqueadoAte: null,
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revogado: false },
        data: { revogado: true, revogadoEm: new Date(), revogadoMotivo: 'PASSWORD_CHANGED' },
      }),
    ] as Prisma.PrismaPromise<unknown>[]);

    await this.logAudit({
      userId,
      acao: 'SENHA_ALTERADA',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  },
};
