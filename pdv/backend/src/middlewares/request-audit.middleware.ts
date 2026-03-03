import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';

const MAX_ACTION_LENGTH = 300;
const MAX_USER_AGENT_LENGTH = 500;
const MAX_IP_LENGTH = 80;

function readUserAgent(header: string | string[] | undefined): string | null {
  if (!header) return null;
  const value = Array.isArray(header) ? header.join(' | ') : header;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_USER_AGENT_LENGTH);
}

function readIp(req: Request): string | null {
  const raw = req.ip?.trim();
  if (!raw) return null;
  return raw.slice(0, MAX_IP_LENGTH);
}

function safePath(req: Request): string {
  // Evita gravar query string para nao registrar segredos acidentalmente.
  const raw = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
  const path = raw || req.originalUrl || '/';
  return path.slice(0, 180);
}

function buildAction(req: Request, statusCode: number, durationMs: number): string {
  const method = req.method.toUpperCase();
  const path = safePath(req);
  const roundedMs = Math.max(0, Math.round(durationMs));
  const action = `REQ ${method} ${path} [${statusCode}] ${roundedMs}ms`;
  return action.slice(0, MAX_ACTION_LENGTH);
}

export function requestAuditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const started = process.hrtime.bigint();
  let persisted = false;

  const persist = (): void => {
    if (persisted) return;
    persisted = true;

    const elapsedNs = process.hrtime.bigint() - started;
    const durationMs = Number(elapsedNs) / 1_000_000;
    const acao = buildAction(req, res.statusCode, durationMs);
    const ip = readIp(req);
    const userAgent = readUserAgent(req.headers['user-agent']);
    const userId = req.userId ?? null;

    void prisma.auditLog
      .create({
        data: {
          userId,
          acao,
          ip,
          userAgent,
        },
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[request-audit] falha ao persistir log de requisicao:', message);
      });
  };

  res.on('finish', persist);
  res.on('close', persist);

  next();
}
