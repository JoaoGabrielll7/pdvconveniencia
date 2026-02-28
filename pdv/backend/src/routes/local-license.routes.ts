import { Role } from '@prisma/client';
import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { localLicenseController } from '../modules/local-license/local-license.controller';

const router = Router();

router.get('/status', localLicenseController.status);
router.post('/renew', localLicenseController.renew);
router.patch('/password', authMiddleware, authorizeRoles(Role.ADMIN), localLicenseController.changePassword);

export const localLicenseRoutes = router;
