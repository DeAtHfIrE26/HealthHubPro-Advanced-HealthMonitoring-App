/**
 * Password hashing and session handling.
 *
 * Sessions are a signed, httpOnly cookie carrying the user id — no server-side
 * session store, which is what makes this work on serverless where every
 * request may hit a different cold instance.
 */
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import type { User } from '../shared/schema';
import { env } from './env';
import { getStorage } from './storage';

export const SESSION_COOKIE = 'hhp_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function issueSession(res: Response, userId: number): void {
  res.cookie(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
  });
}

function readUserId(req: Request): number | null {
  const raw = req.signedCookies?.[SESSION_COOKIE];
  if (typeof raw !== 'string') return null;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/** Attaches req.user when a valid session cookie is present. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const id = readUserId(req);
    if (id !== null) {
      const storage = await getStorage();
      req.user = (await storage.getUserById(id)) ?? undefined;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Rejects with 401 unless a valid session is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  next();
}
