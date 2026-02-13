import express from 'express';
import cors from 'cors';

import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json());
  app.use(apiRouter);
  app.use(errorHandler);

  return app;
}
