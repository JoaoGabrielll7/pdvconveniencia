import { LicensePlanType, LicenseStatus } from '@prisma/client';
import { z } from 'zod';

export const createLicenseSchema = z.object({
  userId: z.string().uuid('userId invalido'),
  planType: z.nativeEnum(LicensePlanType),
  maxDevices: z.coerce.number().int().min(1).max(100),
  validityDays: z.coerce.number().int().min(1).max(3650).optional(),
});

export const validateLicenseSchema = z.object({
  licenseKey: z
    .string()
    .trim()
    .regex(/^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'licenseKey invalida'),
  deviceId: z.string().trim().min(3).max(200),
});

export const listLicensesQuerySchema = z.object({
  status: z.nativeEnum(LicenseStatus).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  user: z.string().trim().min(1).max(191).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const licenseIdParamSchema = z.object({
  id: z.string().uuid('id invalido'),
});

export const addDaysSchema = z.object({
  days: z.coerce.number().int().min(1).max(3650),
});

export const removeDaysSchema = z.object({
  days: z.coerce.number().int().min(1).max(3650),
});

export const changePlanSchema = z.object({
  planType: z.nativeEnum(LicensePlanType),
  maxDevices: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type ValidateLicenseInput = z.infer<typeof validateLicenseSchema>;
export type ListLicensesQuery = z.infer<typeof listLicensesQuerySchema>;
export type AddDaysInput = z.infer<typeof addDaysSchema>;
export type RemoveDaysInput = z.infer<typeof removeDaysSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
