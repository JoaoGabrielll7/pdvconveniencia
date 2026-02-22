import { Router } from 'express';
import { vendaController } from '../controllers/venda.controller';
import { validate } from '../middlewares/validate';
import { createVendaSchema, queryVendaSchema } from '../validations/venda.schema';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { ensureCaixaOpen } from '../middlewares/ensureCaixaOpen';

const router = Router();

router.use(authMiddleware);
router.get('/', authorizeRoles(Role.ADMIN, Role.CAIXA), validate(queryVendaSchema, 'query'), vendaController.list);
router.delete('/historico', authorizeRoles(Role.ADMIN), vendaController.clearHistory);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.CAIXA), vendaController.getById);
router.post('/', authorizeRoles(Role.ADMIN, Role.CAIXA), ensureCaixaOpen, validate(createVendaSchema), vendaController.create);

export const vendaRoutes = router;
