import { RequestHandler } from 'express';

import { AppError } from '../lib/http.js';

export type UserRole = 'user' | 'admin';

export type AuthenticatedUser = {
  id: string;
  email?: string;
  role: UserRole;
};

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

function toBase64(input: string): string {
  return input.replace(/-/g, '+').replace(/_/g, '/');
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = toBase64(parts[1]);
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    const payload = JSON.parse(json) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

function parseAuthToken(raw: string): AuthenticatedUser | null {
  if (raw.startsWith('dev_')) {
    const id = raw.slice(4).trim();
    if (!id) return null;

    return {
      id,
      role: id === 'admin' ? 'admin' : 'user',
      email: `${id}@local.predictify.dev`,
    };
  }

  const payload = parseJwtPayload(raw);
  if (!payload?.sub) return null;

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role === 'admin' ? 'admin' : 'user',
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(new AppError('Missing bearer token.', 401));
  }

  const token = header.slice('bearer '.length).trim();
  const user = parseAuthToken(token);

  if (!user) {
    return next(new AppError('Invalid authentication token.', 401));
  }

  req.user = user;
  return next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin role required.', 403));
  }

  return next();
};
