import { Router } from 'express';

import { assetsRouter } from './assets';
import { historyRouter } from './history';
import { marketsRouter } from './markets';
import { modelsRouter } from './models';
import { predictionsRouter } from './predictions';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

apiRouter.use('/api', assetsRouter);
apiRouter.use('/api', marketsRouter);
apiRouter.use('/api', historyRouter);
apiRouter.use('/api', predictionsRouter);
apiRouter.use('/api', modelsRouter);
