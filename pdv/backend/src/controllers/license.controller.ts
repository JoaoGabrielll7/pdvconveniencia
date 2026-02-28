import type { NextFunction, Request, Response } from 'express';
import { licenseService } from '../services/license.service';
import type {
  AddDaysInput,
  ChangePlanInput,
  CreateLicenseInput,
  ListLicensesQuery,
  RemoveDaysInput,
  ValidateLicenseInput,
} from '../validators/license.validator';

function actor(req: Request) {
  return { userId: req.userId, role: req.userRole };
}

export const licenseController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.create(req.body as CreateLicenseInput, actor(req));
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.validate(req.body as ValidateLicenseInput);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.list(req.query as unknown as ListLicensesQuery);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async block(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.block(req.params.id, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.activate(req.params.id, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async expire(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.expire(req.params.id, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async addDays(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.addDays(req.params.id, req.body as AddDaysInput, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async removeDays(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.removeDays(req.params.id, req.body as RemoveDaysInput, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async changePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.changePlan(req.params.id, req.body as ChangePlanInput, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.delete(req.params.id, actor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async history(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.history(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async activations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.activations(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async current(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await licenseService.currentByUser(req.userId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
