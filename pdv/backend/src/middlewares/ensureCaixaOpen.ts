import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';

export async function ensureCaixaOpen(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Nao autenticado' });
    const caixa = await prisma.caixa.findFirst({
      where: { operadorId: userId, status: 'ABERTO' },
      select: { id: true },
    });
    if (!caixa) {
      return res.status(400).json({
        success: false,
        message: 'Caixa fechado. Abra o caixa para finalizar vendas.',
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

