import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { LicensePlanType, LicenseStatus } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateLicenseKey(): string {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `LIC-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function hashDeviceId(deviceId: string): string {
  return crypto.createHash('sha256').update(deviceId).digest('hex');
}

export function resolveExpiresAtByPlan(planType: LicensePlanType, now = new Date()): Date | null {
  if (planType === LicensePlanType.LIFETIME) return null;
  const days = planType === LicensePlanType.ANNUAL ? 365 : 30;
  return new Date(now.getTime() + days * DAY_MS);
}

export function addDaysToDate(baseDate: Date, days: number): Date {
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    throw new AppError(400, 'Quantidade de dias invalida', 'INVALID_DAYS');
  }
  return new Date(baseDate.getTime() + Math.floor(days) * DAY_MS);
}

export function subtractDaysFromDate(baseDate: Date, days: number): Date {
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    throw new AppError(400, 'Quantidade de dias invalida', 'INVALID_DAYS');
  }
  return new Date(baseDate.getTime() - Math.floor(days) * DAY_MS);
}

export function isExpired(expiresAt: Date | null, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < now.getTime();
}

export function buildValidationResponse(args: {
  valid: boolean;
  status: LicenseStatus | 'NOT_FOUND' | 'MAX_DEVICES_REACHED';
  expiresAt: Date | null;
  message: string;
  validationToken?: string;
}) {
  return {
    valid: args.valid,
    status: args.status,
    expiresAt: args.expiresAt ? args.expiresAt.toISOString() : null,
    message: args.message,
    validationToken: args.validationToken ?? null,
  };
}

export function signLicenseValidationToken(payload: {
  licenseId: string;
  licenseKey: string;
  userId: string;
  deviceHash: string;
  status: LicenseStatus;
}) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '1h' });
}
