import { Role } from '@prisma/client';
import { Router } from 'express';
import { usuarioController } from '../controllers/usuario.controller';
import { authMiddleware, authorizeRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createUsuarioSchema, queryUsuarioSchema, updateUsuarioSchema } from '../validations/usuario.schema';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(Role.ADMIN));

router.get('/', validate(queryUsuarioSchema, 'query'), usuarioController.list);
router.get('/:id', usuarioController.getById);
router.post('/', validate(createUsuarioSchema), usuarioController.create);
router.patch('/:id', validate(updateUsuarioSchema), usuarioController.update);
router.delete('/:id', usuarioController.delete);

export const usuarioRoutes = router;
