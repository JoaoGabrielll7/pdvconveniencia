import { Role } from '@prisma/client';
import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { systemController } from '../modules/system/system.controller';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(Role.ADMIN));

router.get('/licenses', systemController.listLicenses);
router.post('/licenses/renew', systemController.renewLicense);
router.patch('/licenses/:id/status', systemController.updateLicenseStatus);
router.get('/logs/today', systemController.listTodayLogs);
router.get('/backup/files', systemController.listBackupFiles);
router.post('/backup/create', systemController.createBackup);
router.post('/cache/clear', systemController.clearCache);
router.get('/security/check', systemController.securityCheck);

export const systemRoutes = router;
