import rateLimit from 'express-rate-limit';

export const licenseValidateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas validacoes de licenca por minuto. Aguarde e tente novamente.',
    code: 'LICENSE_VALIDATE_RATE_LIMIT',
  },
});

