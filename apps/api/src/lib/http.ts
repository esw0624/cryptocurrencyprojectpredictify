import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodSchema } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(new AppError('Invalid query parameters.', 400, result.error.flatten()));
    }

    req.query = result.data as Request['query'];
    return next();
  };
}

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(new AppError('Invalid request body.', 400, result.error.flatten()));
    }

    req.body = result.data;
    return next();
  };
}
