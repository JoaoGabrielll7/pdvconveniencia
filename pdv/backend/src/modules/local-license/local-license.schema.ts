import { z } from 'zod';

export const renewLocalLicenseSchema = z.object({
  senha: z.string().min(1, 'Senha de renovacao e obrigatoria'),
});

export const changeLocalLicensePasswordSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual e obrigatoria'),
  novaSenha: z.string().min(4, 'Nova senha deve ter no minimo 4 caracteres').max(120, 'Senha muito longa'),
});

export type RenewLocalLicenseInput = z.infer<typeof renewLocalLicenseSchema>;
export type ChangeLocalLicensePasswordInput = z.infer<typeof changeLocalLicensePasswordSchema>;
