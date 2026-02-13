import { Router } from 'express';

import {
  TrainModelRequestDto,
  TrainModelRequestSchema,
  TrainModelResponseDto,
} from '../../../../packages/shared/src/dto/index.js';
import { AppError, validateBody } from '../lib/http.js';

export const modelsRouter = Router();

modelsRouter.post('/models/train', validateBody(TrainModelRequestSchema), (req, res, next) => {
  const trainingApiKey = process.env.MODEL_TRAINING_API_KEY;

  if (trainingApiKey) {
    const providedKey = req.header('x-api-key');

    if (providedKey !== trainingApiKey) {
      return next(new AppError('Unauthorized training request.', 401));
    }
  }

  const body = req.body as TrainModelRequestDto;
  const symbols = body.symbols ?? ['BTC-USD', 'ETH-USD'];

  const response: TrainModelResponseDto = {
    started: true,
    jobId: `train_${Date.now()}`,
    queuedAt: new Date().toISOString(),
    symbols,
  };

  return res.status(202).json(response);
});
