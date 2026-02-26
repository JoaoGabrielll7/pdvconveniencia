import { Role } from '@prisma/client';
import { Router } from 'express';
import { licenseController } from '../controllers/license.controller';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { licenseValidateRateLimit } from '../middlewares/license-rate-limit';
import { validate } from '../middlewares/validate';
import {
  addDaysSchema,
  changePlanSchema,
  createLicenseSchema,
  licenseIdParamSchema,
  listLicensesQuerySchema,
  removeDaysSchema,
  validateLicenseSchema,
} from '../validators/license.validator';

const router = Router();

router.post('/licenses/validate', licenseValidateRateLimit, validate(validateLicenseSchema), licenseController.validate);

router.use(authMiddleware);
router.get('/licenses/current', licenseController.current);

router.use(authorizeRoles(Role.ADMIN, Role.SUPORTE));

router.post('/licenses', validate(createLicenseSchema), licenseController.create);
router.get('/licenses', validate(listLicensesQuerySchema, 'query'), licenseController.list);
router.get('/licenses/:id', validate(licenseIdParamSchema, 'params'), licenseController.getById);
router.patch('/licenses/:id/block', validate(licenseIdParamSchema, 'params'), licenseController.block);
router.patch('/licenses/:id/activate', validate(licenseIdParamSchema, 'params'), licenseController.activate);
router.patch('/licenses/:id/expire', validate(licenseIdParamSchema, 'params'), licenseController.expire);
router.patch('/licenses/:id/add-days', validate(licenseIdParamSchema, 'params'), validate(addDaysSchema), licenseController.addDays);
router.patch('/licenses/:id/remove-days', validate(licenseIdParamSchema, 'params'), validate(removeDaysSchema), licenseController.removeDays);
router.patch('/licenses/:id/plan', validate(licenseIdParamSchema, 'params'), validate(changePlanSchema), licenseController.changePlan);
router.delete('/licenses/:id', validate(licenseIdParamSchema, 'params'), licenseController.delete);
router.get('/licenses/:id/history', validate(licenseIdParamSchema, 'params'), licenseController.history);
router.get('/licenses/:id/activations', validate(licenseIdParamSchema, 'params'), licenseController.activations);

export const licenseRoutes = router;
