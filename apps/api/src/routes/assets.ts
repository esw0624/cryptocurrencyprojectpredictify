import { Router } from 'express';

export const assetsRouter = Router();

assetsRouter.get('/assets', (_req, res) => {
  return res.json({
    assets: [
      { symbol: 'BTC-USD', baseAsset: 'BTC', quoteAsset: 'USD', exchange: 'coinbase', status: 'active' },
      { symbol: 'ETH-USD', baseAsset: 'ETH', quoteAsset: 'USD', exchange: 'coinbase', status: 'active' },
      { symbol: 'XRP-USD', baseAsset: 'XRP', quoteAsset: 'USD', exchange: 'coinbase', status: 'active' },
    ],
  });
});
