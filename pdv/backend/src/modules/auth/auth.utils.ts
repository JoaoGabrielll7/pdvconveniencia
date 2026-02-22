import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '@prisma/client';

type AccessPayload = {
  sub: string;
  role: Role;
  jti: string;
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function randomOpaqueToken(size = 64): string {
  return crypto.randomBytes(size).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: { userId: string; role: Role }): { token: string; jti: string; exp: Date } {
  const jti = crypto.randomUUID();
  const expiresIn = env.accessTokenTtlMinutes * 60;
  const token = jwt.sign(
    { sub: payload.userId, role: payload.role, jti } satisfies AccessPayload,
    env.jwtSecret,
    { expiresIn }
  );
  return { token, jti, exp: new Date(Date.now() + expiresIn * 1000) };
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwtSecret) as AccessPayload;
}

export function getClientIp(rawIp?: string | null): string {
  if (!rawIp) return '0.0.0.0';
  if (rawIp.includes(',')) return rawIp.split(',')[0].trim();
  return rawIp.trim();
}

export function parseCookie(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx <= 0) return acc;
    const key = pair.slice(0, idx).trim();
    const value = decodeURIComponent(pair.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}
