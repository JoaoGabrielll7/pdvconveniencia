import { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { hashToken, verifyAccessToken } from './auth.utils';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      tokenJti?: string;
      accessToken?: string;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'Token nao informado', 'UNAUTHORIZED'));
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const blacklisted = await prisma.tokenBlacklist.findUnique({ where: { tokenHash: hashToken(token) } });
    if (blacklisted && blacklisted.expiraEm > new Date()) {
      throw new AppError(401, 'Token revogado', 'TOKEN_REVOKED');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) throw new AppError(401, 'Usuario inativo', 'UNAUTHORIZED');

    const now = Date.now();
    if (user.ultimoLogin && now - user.ultimoLogin.getTime() > env.sessionInactivityMinutes * 60 * 1000) {
      throw new AppError(401, 'Sessao expirada por inatividade', 'SESSION_EXPIRED');
    }

    await prisma.user.update({ where: { id: user.id }, data: { ultimoLogin: new Date() } });

    req.userId = payload.sub;
    req.userRole = payload.role;
    req.tokenJti = payload.jti;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Token invalido ou expirado', 'UNAUTHORIZED'));
  }
}

export function authorizeRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // ADMIN sempre tem acesso total, mesmo se a rota nao listar explicitamente o role.
    if (req.userRole === Role.ADMIN) {
      next();
      return;
    }
    if (!req.userRole || !roles.includes(req.userRole)) {
      next(new AppError(403, 'Acesso negado para este perfil', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
