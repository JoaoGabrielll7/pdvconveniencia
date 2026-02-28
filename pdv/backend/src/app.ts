import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { routes } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { localLicenseGuard } from './middlewares/local-license.guard';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (req.secure || env.nodeEnv !== 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(express.json({ limit: '1mb' }));

/** Raiz: evita "Cannot GET /" e indica rotas úteis */
app.get('/', (_req, res) => {
  res.json({
    name: 'PDV Conveniência API',
    health: '/api/health',
    dbCheck: '/api/health/db',
    dbCheckPage: '/db-check',
  });
});

/** Página simples para verificar conexão com o banco (útil em deploy, ex: Vercel) */
app.get('/db-check', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificar conexão - PDV Conveniência</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 2rem auto; padding: 1rem; background: #f5f5f5; }
    h1 { font-size: 1.25rem; color: #333; margin-bottom: 1rem; }
    .card { background: #fff; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .status { display: flex; align-items: center; gap: 0.5rem; margin: 0.75rem 0; font-weight: 500; }
    .status.ok { color: #0a0; }
    .status.err { color: #c00; }
    .detail { font-size: 0.875rem; color: #666; margin-top: 0.5rem; }
    .spinner { width: 20px; height: 20px; border: 2px solid #eee; border-top-color: #333; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    pre { background: #f8f8f8; padding: 0.75rem; border-radius: 4px; overflow: auto; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Verificar conexão com o banco</h1>
    <div id="out">
      <div class="status"><div class="spinner"></div> Verificando...</div>
    </div>
    <div id="detail" class="detail"></div>
  </div>
  <script>
    (function() {
      var out = document.getElementById('out');
      var detail = document.getElementById('detail');
      fetch('./api/health/db').then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            out.innerHTML = '<div class="status ok">✓ Banco de dados conectado</div>';
            detail.textContent = 'Latência: ' + (data.latencyMs || 0) + ' ms';
          } else {
            out.innerHTML = '<div class="status err">✗ Falha na conexão</div>';
            detail.innerHTML = '<pre>' + (data.error || data.message || '') + '</pre>';
          }
        })
        .catch(function(e) {
          out.innerHTML = '<div class="status err">✗ Erro ao verificar</div>';
          detail.innerHTML = '<pre>' + e.message + '</pre>';
        });
    })();
  </script>
</body>
</html>
  `);
});

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: env.globalRateLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisicoes por minuto. Aguarde alguns segundos e tente novamente.',
    code: 'TOO_MANY_REQUESTS',
  },
});

app.use('/api', apiRateLimit, localLicenseGuard, routes);
app.use(errorHandler);

export { app };
