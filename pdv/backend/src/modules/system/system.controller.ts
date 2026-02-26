import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../errors/AppError';
import { systemService } from './system.service';

function reqContext(req: Request) {
  return {
    userId: req.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export const systemController = {
  async listLicenses(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await systemService.listLicenses();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async renewLicense(req: Request, res: Response, next: NextFunction) {
    try {
      const expiresAtRaw = typeof req.body?.expiresAt === 'string' ? req.body.expiresAt : undefined;
      const data = await systemService.renewLicense(reqContext(req), {
        owner: typeof req.body?.owner === 'string' ? req.body.owner : undefined,
        dias: typeof req.body?.dias === 'number' ? req.body.dias : undefined,
        userId: typeof req.body?.userId === 'string' ? req.body.userId : undefined,
        expiresAt: expiresAtRaw,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateLicenseStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const rawStatus = typeof req.body?.status === 'string' ? req.body.status.toUpperCase() : '';
      if (rawStatus !== 'ATIVA' && rawStatus !== 'EXPIRADA' && rawStatus !== 'BLOQUEADA') {
        throw new AppError(400, 'Status de licenca invalido', 'INVALID_STATUS');
      }
      const data = await systemService.updateLicenseStatus(req.params.id, rawStatus, reqContext(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listTodayLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit ?? 120);
      const data = await systemService.listTodayLogs(limit);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await systemService.createBackup(reqContext(req));
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async listBackupFiles(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await systemService.listBackupFiles();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async clearCache(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await systemService.clearCache(reqContext(req));
      res.json({ success: true, data, message: 'Cache limpo com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  securityCheck(_req: Request, res: Response) {
    const data = systemService.securityCheck();
    res.json({ success: true, data });
  },
};
