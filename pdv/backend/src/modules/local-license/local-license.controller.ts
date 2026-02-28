import type { NextFunction, Request, Response } from 'express';
import {
  changeLocalLicensePasswordSchema,
  renewLocalLicenseSchema,
  type ChangeLocalLicensePasswordInput,
  type RenewLocalLicenseInput,
} from './local-license.schema';
import { localLicenseService } from './local-license.service';

function reqContext(req: Request) {
  return {
    userId: req.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export const localLicenseController = {
  async status(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await localLicenseService.status();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const body = renewLocalLicenseSchema.parse(req.body) as RenewLocalLicenseInput;
      const data = await localLicenseService.renew(body, reqContext(req));
      res.json({ success: true, data, message: 'Licenca renovada com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = changeLocalLicensePasswordSchema.parse(req.body) as ChangeLocalLicensePasswordInput;
      await localLicenseService.changePassword(body, reqContext(req));
      res.json({ success: true, message: 'Senha de renovacao atualizada com sucesso' });
    } catch (error) {
      next(error);
    }
  },
};
