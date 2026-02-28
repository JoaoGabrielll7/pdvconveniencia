import { Router } from 'express';
import { produtoController } from '../controllers/produto.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import {
  createProdutoSchema,
  updateProdutoSchema,
  queryProdutoSchema,
} from '../validations/produto.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', authorizeRoles(Role.ADMIN, Role.CAIXA), validate(queryProdutoSchema, 'query'), produtoController.list);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.CAIXA), produtoController.getById);
router.post('/', authorizeRoles(Role.ADMIN), validate(createProdutoSchema), produtoController.create);
router.patch('/:id', authorizeRoles(Role.ADMIN), validate(updateProdutoSchema), produtoController.update);
router.delete('/:id', authorizeRoles(Role.ADMIN), produtoController.delete);

export const produtoRoutes = router;
