import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export type LicenseAccessRole = 'ADMIN' | 'SUPORTE' | 'OPERADOR';

function normalizeRole(role?: string): LicenseAccessRole | null {
  if (!role) return null;
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'SUPORTE') return 'SUPORTE';
  if (normalized === 'OPERADOR' || normalized === 'CAIXA') return 'OPERADOR';
  return null;
}

export function authorizeLicenseRoles(...allowedRoles: LicenseAccessRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const currentRole = normalizeRole(req.userRole ? String(req.userRole) : undefined);
    if (currentRole === 'ADMIN') {
      next();
      return;
    }
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      next(new AppError(403, 'Acesso negado para este perfil', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
