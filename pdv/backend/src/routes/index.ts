import { Router } from 'express';
import { prisma } from '../config/database';
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

/** Status da configuração (sem expor valores) - para página de verificação de erro */
router.get('/health/config', (_req, res) => {
  res.json({
    jwtSecretSet: Boolean(process.env.JWT_SECRET),
    databaseUrlSet: Boolean(process.env.DATABASE_URL),
    directUrlSet: Boolean(process.env.DIRECT_URL),
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

/** Verifica conexão com o banco de dados - use para debug/deploy (ex: Vercel) */
router.get('/health/db', async (_req, res) => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    res.json({
      success: true,
      database: 'connected',
      latencyMs,
      message: 'Conexão com o banco de dados OK',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(503).json({
      success: false,
      database: 'error',
      message: 'Falha ao conectar no banco de dados',
      error: message,
    });
  }
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
