import { Router } from 'express';
import { categoriaController } from '../controllers/categoria.controller';
import { validate } from '../middlewares/validate';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import {
  createCategoriaSchema,
  updateCategoriaSchema,
} from '../validations/categoria.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', authorizeRoles(Role.ADMIN, Role.CAIXA), categoriaController.list);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.CAIXA), categoriaController.getById);
router.post('/', authorizeRoles(Role.ADMIN), validate(createCategoriaSchema), categoriaController.create);
router.patch('/:id', authorizeRoles(Role.ADMIN), validate(updateCategoriaSchema), categoriaController.update);
router.delete('/:id', authorizeRoles(Role.ADMIN), categoriaController.delete);

export const categoriaRoutes = router;
