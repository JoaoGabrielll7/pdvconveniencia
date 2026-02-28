import { Request, Response, NextFunction } from 'express';
import { produtoService } from '../services/produto.service';
import type {
  CreateProdutoInput,
  UpdateProdutoInput,
  QueryProdutoInput,
} from '../validations/produto.schema';

export const produtoController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as QueryProdutoInput;
      const data = await produtoService.list(query);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await produtoService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateProdutoInput;
      const data = await produtoService.create(body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdateProdutoInput;
      const data = await produtoService.update(req.params.id, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await produtoService.delete(req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
