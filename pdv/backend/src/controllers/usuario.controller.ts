import { Request, Response, NextFunction } from 'express';
import { usuarioService } from '../services/usuario.service';
import type { CreateUsuarioInput, QueryUsuarioInput, UpdateUsuarioInput } from '../validations/usuario.schema';

export const usuarioController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as QueryUsuarioInput;
      const data = await usuarioService.list(query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await usuarioService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateUsuarioInput;
      const data = await usuarioService.create(body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as UpdateUsuarioInput;
      const data = await usuarioService.update(req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await usuarioService.delete(req.params.id, req.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
