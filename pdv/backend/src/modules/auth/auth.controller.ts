import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../errors/AppError';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateMeSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type UpdateMeInput,
} from './auth.schema';
import { authService } from './auth.service';
import { getClientIp, parseCookie } from './auth.utils';

function reqContext(req: Request) {
  return {
    ip: getClientIp(req.ip || req.headers['x-forwarded-for']?.toString() || null),
    userAgent: req.headers['user-agent'],
  };
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body) as LoginInput;
      const data = await authService.login(body, reqContext(req));
      res.cookie(authService.refreshCookieName, data.refreshToken, authService.refreshCookieOptions());
      res.json({
        success: true,
        data: {
          user: data.user,
          token: data.accessToken,
          tokenExpiraEm: data.accessTokenExpiraEm,
          licenseKey: data.licenseKey,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const cookies = parseCookie(req.headers.cookie);
      const refreshToken = cookies[authService.refreshCookieName];
      const data = await authService.refresh(refreshToken, reqContext(req));
      res.cookie(authService.refreshCookieName, data.refreshToken, authService.refreshCookieOptions());
      res.json({
        success: true,
        data: {
          user: data.user,
          token: data.accessToken,
          tokenExpiraEm: data.accessTokenExpiraEm,
          licenseKey: data.licenseKey,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const cookies = parseCookie(req.headers.cookie);
      const refreshToken = cookies[authService.refreshCookieName];
      await authService.logout({
        userId: req.userId,
        accessToken: req.accessToken,
        refreshToken,
        ...reqContext(req),
      });
      res.clearCookie(authService.refreshCookieName, authService.refreshCookieOptions());
      res.json({ success: true, message: 'Sessao encerrada' });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) throw new AppError(401, 'Token invalido', 'UNAUTHORIZED');
      const data = await authService.me(req.userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) throw new AppError(401, 'Token invalido', 'UNAUTHORIZED');
      const body = updateMeSchema.parse(req.body) as UpdateMeInput;
      const data = await authService.updateMe(req.userId, body, reqContext(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) throw new AppError(401, 'Token invalido', 'UNAUTHORIZED');
      const body = changePasswordSchema.parse(req.body) as ChangePasswordInput;
      await authService.changePassword(req.userId, body, reqContext(req));
      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = forgotPasswordSchema.parse(req.body) as ForgotPasswordInput;
      const result = await authService.forgotPassword(body, reqContext(req));
      res.json({
        success: true,
        message: 'Se o e-mail existir, enviaremos as instrucoes de recuperacao.',
        ...(result.token ? { devToken: result.token } : {}),
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body) as ResetPasswordInput;
      await authService.resetPassword(body, reqContext(req));
      res.json({ success: true, message: 'Senha redefinida com sucesso.' });
    } catch (error) {
      next(error);
    }
  },
};
