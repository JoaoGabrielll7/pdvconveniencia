import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Middleware que valida body, query ou params com Zod.
 * Chama next() com o erro para o errorHandler global tratar.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      next(result.error);
      return;
    }
    req[source] = result.data;
    next();
  };
}
