import { Request, Response, NextFunction } from 'express';
import { categoriaService } from '../services/categoria.service';
import type { CreateCategoriaInput, UpdateCategoriaInput } from '../validations/categoria.schema';

export const categoriaController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await categoriaService.list();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await categoriaService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateCategoriaInput;
      const data = await categoriaService.create(body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdateCategoriaInput;
      const data = await categoriaService.update(req.params.id, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await categoriaService.delete(req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
