import type { NextFunction, Request, Response } from 'express';
import { caixaService } from './caixa.service';
import { abrirCaixaSchema, fecharCaixaSchema, listarMovimentosSchema, movimentoCaixaSchema, type AbrirCaixaInput, type FecharCaixaInput, type ListarMovimentosInput, type MovimentoCaixaInput } from './caixa.schema';

function ctx(req: Request) {
  return {
    userId: req.userId!,
    userRole: req.userRole,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export const caixaController = {
  async abrir(req: Request, res: Response, next: NextFunction) {
    try {
      const body = abrirCaixaSchema.parse(req.body) as AbrirCaixaInput;
      const data = await caixaService.abrir(body, ctx(req));
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async sangria(req: Request, res: Response, next: NextFunction) {
    try {
      const body = movimentoCaixaSchema.parse(req.body) as MovimentoCaixaInput;
      const data = await caixaService.registrarSangria(body, ctx(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async suprimento(req: Request, res: Response, next: NextFunction) {
    try {
      const body = movimentoCaixaSchema.parse(req.body) as MovimentoCaixaInput;
      const data = await caixaService.registrarSuprimento(body, ctx(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async fechar(req: Request, res: Response, next: NextFunction) {
    try {
      const body = fecharCaixaSchema.parse(req.body) as FecharCaixaInput;
      const data = await caixaService.fechar(body, ctx(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async ativo(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await caixaService.caixaAtivo(ctx(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async historico(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listarMovimentosSchema.parse(req.query) as ListarMovimentosInput;
      const data = await caixaService.historico(ctx(req), query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async clearHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await caixaService.clearHistory(ctx(req));
      res.json({ success: true, data, message: 'Historico de caixa limpo com sucesso' });
    } catch (error) {
      next(error);
    }
  },

  async indicadores(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await caixaService.indicadores(ctx(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
