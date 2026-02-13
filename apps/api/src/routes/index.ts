import { Router } from 'express';

import { assetsRouter } from './assets.js';
import { historyRouter } from './history.js';
import { marketsRouter } from './markets.js';
import { modelsRouter } from './models.js';
import { predictionsRouter } from './predictions.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

apiRouter.use('/api', assetsRouter);
apiRouter.use('/api', marketsRouter);
apiRouter.use('/api', historyRouter);
apiRouter.use('/api', predictionsRouter);
apiRouter.use('/api', modelsRouter);
