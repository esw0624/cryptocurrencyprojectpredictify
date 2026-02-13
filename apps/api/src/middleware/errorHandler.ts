import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../lib/http.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details ?? null,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed.',
        details: err.flatten(),
      },
    });
  }

  return res.status(500).json({
    error: {
      message: 'Internal server error.',
      details: null,
    },
  });
};
