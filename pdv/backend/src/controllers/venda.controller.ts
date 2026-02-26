import { Request, Response, NextFunction } from 'express';
import { vendaService } from '../services/venda.service';
import type { CreateVendaInput, QueryVendaInput } from '../validations/venda.schema';

export const vendaController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as QueryVendaInput;
      const data = await vendaService.list(query);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vendaService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateVendaInput;
      const data = await vendaService.create(body, {
        userId: req.userId!,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async clearHistory(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vendaService.clearHistory();
      res.json({ success: true, data, message: 'Historico de vendas limpo com sucesso' });
    } catch (e) {
      next(e);
    }
  },
};
