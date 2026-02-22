import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: unknown;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod: validação
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      message: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      errors: err.flatten().fieldErrors,
    };
    res.status(400).json(response);
    return;
  }

  // AppError: erros de negócio
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      code: err.code,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Erro genérico (não expor detalhes em produção)
  const message =
    env.nodeEnv === 'production'
      ? 'Erro interno do servidor'
      : err instanceof Error
        ? err.message
        : 'Erro desconhecido';

  const response: ErrorResponse = {
    success: false,
    message,
  };

  if (env.nodeEnv !== 'production' && err instanceof Error) {
    (response as ErrorResponse & { stack?: string }).stack = err.stack;
  }

  res.status(500).json(response);
}
