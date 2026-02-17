import { Router } from 'express';
import { z } from 'zod';

import { validateBody } from '../lib/http.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  addAuditEvent,
  addWatchlistItem,
  createAlertRule,
  createPosition,
  deleteAlertRule,
  getBillingProfile,
  listAlertRules,
  listAuditEvents,
  listPositions,
  listWatchlist,
  removeWatchlistItem,
  updateBillingTier,
} from '../store/platformStore.js';

const createAlertRuleSchema = z.object({
  asset: z.string().min(2).max(20),
  condition: z.enum(['price_above', 'price_below', 'percent_change_above']),
  threshold: z.number().positive(),
  cooldownMinutes: z.number().int().min(1).max(1440).default(30),
});

const createPositionSchema = z.object({
  symbol: z.string().min(2).max(20),
  quantity: z.number().positive(),
  averageEntryUsd: z.number().positive(),
});

const createWatchlistItemSchema = z.object({
  symbol: z.string().min(2).max(20),
});

const updateTierSchema = z.object({
  tier: z.enum(['free', 'pro', 'premium']),
});

export const platformRouter = Router();

platformRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

platformRouter.get('/alerts/rules', requireAuth, (req, res) => {
  const userId = req.user!.id;
  const rules = listAlertRules(userId);
  return res.json({ rules });
});

platformRouter.post('/alerts/rules', requireAuth, validateBody(createAlertRuleSchema), (req, res) => {
  const userId = req.user!.id;
  const payload = req.body as z.infer<typeof createAlertRuleSchema>;
  const rule = createAlertRule({ userId, ...payload, asset: payload.asset.toUpperCase() });

  addAuditEvent(userId, 'alert_rule_created', 'alert_rule', rule.id, {
    asset: rule.asset,
    threshold: rule.threshold,
  });

  return res.status(201).json({ rule });
});

platformRouter.delete('/alerts/rules/:ruleId', requireAuth, (req, res) => {
  const userId = req.user!.id;
  const ruleId = String(req.params.ruleId);
  const removed = deleteAlertRule(userId, ruleId);

  if (!removed) {
    return res.status(404).json({ error: 'Alert rule not found.' });
  }

  addAuditEvent(userId, 'alert_rule_deleted', 'alert_rule', ruleId);

  return res.status(204).send();
});

platformRouter.get('/portfolio/positions', requireAuth, (req, res) => {
  const userId = req.user!.id;
  return res.json({ positions: listPositions(userId) });
});

platformRouter.post('/portfolio/positions', requireAuth, validateBody(createPositionSchema), (req, res) => {
  const userId = req.user!.id;
  const payload = req.body as z.infer<typeof createPositionSchema>;
  const position = createPosition({ userId, ...payload, symbol: payload.symbol.toUpperCase() });

  addAuditEvent(userId, 'portfolio_position_created', 'portfolio_position', position.id, {
    symbol: position.symbol,
    quantity: position.quantity,
  });

  return res.status(201).json({ position });
});

platformRouter.get('/watchlists/items', requireAuth, (req, res) => {
  const userId = req.user!.id;
  return res.json({ items: listWatchlist(userId) });
});

platformRouter.post('/watchlists/items', requireAuth, validateBody(createWatchlistItemSchema), (req, res) => {
  const userId = req.user!.id;
  const payload = req.body as z.infer<typeof createWatchlistItemSchema>;
  const item = addWatchlistItem(userId, payload.symbol);

  addAuditEvent(userId, 'watchlist_item_added', 'watchlist_item', item.id, {
    symbol: item.symbol,
  });

  return res.status(201).json({ item });
});

platformRouter.delete('/watchlists/items/:itemId', requireAuth, (req, res) => {
  const userId = req.user!.id;
  const itemId = String(req.params.itemId);
  const removed = removeWatchlistItem(userId, itemId);

  if (!removed) {
    return res.status(404).json({ error: 'Watchlist item not found.' });
  }

  addAuditEvent(userId, 'watchlist_item_removed', 'watchlist_item', itemId);
  return res.status(204).send();
});

platformRouter.get('/billing/profile', requireAuth, (req, res) => {
  const profile = getBillingProfile(req.user!.id);
  return res.json({ profile });
});

platformRouter.post('/billing/profile/tier', requireAuth, validateBody(updateTierSchema), (req, res) => {
  const userId = req.user!.id;
  const payload = req.body as z.infer<typeof updateTierSchema>;

  const profile = updateBillingTier(userId, payload.tier);

  addAuditEvent(userId, 'billing_tier_updated', 'billing_profile', userId, {
    tier: payload.tier,
  });

  return res.json({ profile });
});

platformRouter.get('/admin/audit-logs', requireAuth, requireAdmin, (req, res) => {
  const requestedLimit = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;

  return res.json({
    logs: listAuditEvents(limit),
    count: limit,
  });
});
