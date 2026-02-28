import { LicensePlanType, Role } from '@prisma/client';
import { z } from 'zod';

export const queryUsuarioSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  busca: z.string().max(120).optional(),
});

export const createUsuarioSchema = z.object({
  nome: z.string().trim().min(1, 'Nome e obrigatorio').max(180),
  email: z.string().trim().email('E-mail invalido').max(200),
  senha: z.string().min(4, 'Senha deve ter ao menos 4 caracteres').max(120),
  role: z.nativeEnum(Role).default(Role.CAIXA),
  ativo: z.boolean().optional(),
  licensePlanType: z.nativeEnum(LicensePlanType).optional(),
  licenseMaxDevices: z.coerce.number().int().min(1).max(100).optional(),
  licenseValidityDays: z.coerce.number().int().min(1).max(3650).optional(),
});

export const updateUsuarioSchema = z.object({
  nome: z.string().trim().min(1, 'Nome e obrigatorio').max(180).optional(),
  email: z.string().trim().email('E-mail invalido').max(200).optional(),
  senha: z.string().min(4, 'Senha deve ter ao menos 4 caracteres').max(120).optional(),
  role: z.nativeEnum(Role).optional(),
  ativo: z.boolean().optional(),
});

export type QueryUsuarioInput = z.infer<typeof queryUsuarioSchema>;
export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
