import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import type { LoginInput } from '../validations/auth.schema';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as LoginInput;
      const data = await authService.login(body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const data = await authService.me(userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
