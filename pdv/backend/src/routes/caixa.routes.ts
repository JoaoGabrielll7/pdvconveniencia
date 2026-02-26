import { Role } from '@prisma/client';
import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { caixaController } from '../modules/caixa/caixa.controller';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(Role.ADMIN, Role.CAIXA));

router.get('/ativo', caixaController.ativo);
router.get('/historico', caixaController.historico);
router.delete('/historico', authorizeRoles(Role.ADMIN), caixaController.clearHistory);
router.get('/indicadores', caixaController.indicadores);
router.post('/abrir', caixaController.abrir);
router.post('/sangria', caixaController.sangria);
router.post('/suprimento', caixaController.suprimento);
router.post('/fechar', caixaController.fechar);

export const caixaRoutes = router;
