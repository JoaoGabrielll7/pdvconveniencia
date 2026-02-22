import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { categoriaRoutes } from './categoria.routes';
import { fornecedorRoutes } from './fornecedor.routes';
import { produtoRoutes } from './produto.routes';
import { usuarioRoutes } from './usuario.routes';
import { vendaRoutes } from './venda.routes';
import { caixaRoutes } from './caixa.routes';
import { systemRoutes } from './system.routes';
import { licenseRoutes } from './license.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API Conveniência OK' });
});

router.use('/auth', authRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/produtos', produtoRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/fornecedores', fornecedorRoutes);
router.use('/vendas', vendaRoutes);
router.use('/caixas', caixaRoutes);
router.use('/system', systemRoutes);
router.use('/', licenseRoutes);

export const routes = router;
