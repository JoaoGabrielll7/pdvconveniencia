import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import type { LoginInput } from '../validations/auth.schema';

function hashSenha(senha: string): string {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

export const authService = {
  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (!user) {
      throw new AppError(401, 'E-mail ou senha inválidos', 'UNAUTHORIZED');
    }
    const hash = hashSenha(data.senha);
    if (user.senhaHash !== hash) {
      throw new AppError(401, 'E-mail ou senha inválidos', 'UNAUTHORIZED');
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: '7d' }
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
      },
      token,
    };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new AppError(404, 'Usuário não encontrado', 'NOT_FOUND');
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
    };
  },
};
