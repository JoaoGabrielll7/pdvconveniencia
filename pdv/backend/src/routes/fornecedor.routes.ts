import { Role } from '@prisma/client';
import { Router } from 'express';
import { fornecedorController } from '../controllers/fornecedor.controller';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createFornecedorSchema, queryFornecedorSchema, updateFornecedorSchema } from '../validations/fornecedor.schema';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(Role.ADMIN));

router.get('/', validate(queryFornecedorSchema, 'query'), fornecedorController.list);
router.get('/:id', fornecedorController.getById);
router.post('/', validate(createFornecedorSchema), fornecedorController.create);
router.patch('/:id', validate(updateFornecedorSchema), fornecedorController.update);
router.delete('/:id', fornecedorController.delete);

export const fornecedorRoutes = router;
