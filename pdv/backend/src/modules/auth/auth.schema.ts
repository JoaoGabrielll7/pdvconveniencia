import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  senha: z.string().min(1, 'Senha e obrigatoria'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail invalido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Token invalido'),
  novaSenha: z.string().min(8, 'A nova senha deve ter no minimo 8 caracteres'),
});

export const updateMeSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(120, 'Nome muito longo'),
  email: z.string().email('E-mail invalido'),
});

export const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual e obrigatoria'),
  novaSenha: z.string().min(4, 'A nova senha deve ter no minimo 4 caracteres').max(120, 'Senha muito longa'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
