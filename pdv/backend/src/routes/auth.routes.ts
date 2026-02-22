import { Router } from 'express';
import { authController } from '../modules/auth/auth.controller';
import { authMiddleware } from '../modules/auth/auth.middleware';
import { authLoginRateLimit } from '../modules/auth/auth.rate-limit';

const router = Router();

router.post('/login', authLoginRateLimit, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, authController.updateMe);
router.patch('/me/password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

export const authRoutes = router;
