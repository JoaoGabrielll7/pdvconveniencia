import type { NextFunction, Request, Response } from 'express';
import { localLicenseService } from '../modules/local-license/local-license.service';

const PUBLIC_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

function isAllowedPath(req: Request): boolean {
  if (req.method === 'OPTIONS') return true;
  if (req.path.startsWith('/health')) return true;
  if (req.path.startsWith('/local-license')) return true;
  if (PUBLIC_AUTH_PATHS.has(req.path)) return true;
  return false;
}

export async function localLicenseGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isAllowedPath(req)) {
    next();
    return;
  }

  try {
    const status = await localLicenseService.status();
    if (status.bloqueado) {
      res.status(423).json({
        success: false,
        code: 'LOCAL_LICENSE_BLOCKED',
        message: 'Licenca local expirada. Renove para continuar utilizando o sistema.',
        data: status,
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
