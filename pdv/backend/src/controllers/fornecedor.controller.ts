import { Request, Response, NextFunction } from 'express';
import { fornecedorService } from '../services/fornecedor.service';
import type { CreateFornecedorInput, QueryFornecedorInput, UpdateFornecedorInput } from '../validations/fornecedor.schema';

export const fornecedorController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as QueryFornecedorInput;
      const data = await fornecedorService.list(query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await fornecedorService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateFornecedorInput;
      const data = await fornecedorService.create(body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdateFornecedorInput;
      const data = await fornecedorService.update(req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await fornecedorService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
