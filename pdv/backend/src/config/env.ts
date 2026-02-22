import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'conveniencia-secret-dev',
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 15,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
  loginBlockMinutes: Number(process.env.LOGIN_BLOCK_MINUTES) || 15,
  sessionInactivityMinutes: Number(process.env.SESSION_INACTIVITY_MINUTES) || 30,
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || 30,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  globalRateLimitPerMinute: Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE) || 180,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 30,
  backupDir: process.env.BACKUP_DIR || path.resolve(process.cwd(), 'storage', 'backups'),
} as const;
