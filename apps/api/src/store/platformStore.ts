export type AlertCondition = 'price_above' | 'price_below' | 'percent_change_above';

export type AlertRule = {
  id: string;
  userId: string;
  asset: string;
  condition: AlertCondition;
  threshold: number;
  cooldownMinutes: number;
  createdAt: string;
};

export type PortfolioPosition = {
  id: string;
  userId: string;
  symbol: string;
  quantity: number;
  averageEntryUsd: number;
  createdAt: string;
};

export type WatchlistItem = {
  id: string;
  userId: string;
  symbol: string;
  createdAt: string;
};

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type BillingProfile = {
  userId: string;
  tier: SubscriptionTier;
  alertsLimit: number;
  watchlistLimit: number;
  apiRequestsPerMinute: number;
};

export type AuditEvent = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
};

const alertRules = new Map<string, AlertRule[]>();
const positions = new Map<string, PortfolioPosition[]>();
const watchlistItems = new Map<string, WatchlistItem[]>();
const billingProfiles = new Map<string, BillingProfile>();
const auditLog: AuditEvent[] = [];

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateArray<T>(map: Map<string, T[]>, userId: string): T[] {
  const existing = map.get(userId);
  if (existing) return existing;
  const created: T[] = [];
  map.set(userId, created);
  return created;
}

export function addAuditEvent(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, string | number | boolean>,
): AuditEvent {
  const event: AuditEvent = {
    id: makeId('audit'),
    actorId,
    action,
    targetType,
    targetId,
    timestamp: new Date().toISOString(),
    metadata,
  };

  auditLog.unshift(event);
  return event;
}

export function listAuditEvents(limit = 100): AuditEvent[] {
  return auditLog.slice(0, limit);
}

export function listAlertRules(userId: string): AlertRule[] {
  return [...getOrCreateArray(alertRules, userId)];
}

export function createAlertRule(input: Omit<AlertRule, 'id' | 'createdAt'>): AlertRule {
  const rule: AlertRule = {
    ...input,
    id: makeId('alert'),
    createdAt: new Date().toISOString(),
  };

  getOrCreateArray(alertRules, input.userId).push(rule);
  return rule;
}

export function deleteAlertRule(userId: string, ruleId: string): boolean {
  const rules = getOrCreateArray(alertRules, userId);
  const index = rules.findIndex((item) => item.id === ruleId);
  if (index === -1) return false;
  rules.splice(index, 1);
  return true;
}

export function listPositions(userId: string): PortfolioPosition[] {
  return [...getOrCreateArray(positions, userId)];
}

export function createPosition(input: Omit<PortfolioPosition, 'id' | 'createdAt'>): PortfolioPosition {
  const position: PortfolioPosition = {
    ...input,
    id: makeId('pos'),
    createdAt: new Date().toISOString(),
  };

  getOrCreateArray(positions, input.userId).push(position);
  return position;
}

export function listWatchlist(userId: string): WatchlistItem[] {
  return [...getOrCreateArray(watchlistItems, userId)];
}

export function addWatchlistItem(userId: string, symbol: string): WatchlistItem {
  const existing = getOrCreateArray(watchlistItems, userId);
  const normalized = symbol.toUpperCase();
  const duplicate = existing.find((item) => item.symbol === normalized);
  if (duplicate) return duplicate;

  const item: WatchlistItem = {
    id: makeId('watch'),
    userId,
    symbol: normalized,
    createdAt: new Date().toISOString(),
  };

  existing.push(item);
  return item;
}

export function removeWatchlistItem(userId: string, itemId: string): boolean {
  const items = getOrCreateArray(watchlistItems, userId);
  const idx = items.findIndex((item) => item.id === itemId);
  if (idx === -1) return false;
  items.splice(idx, 1);
  return true;
}

export function getBillingProfile(userId: string): BillingProfile {
  const existing = billingProfiles.get(userId);
  if (existing) return existing;

  const created: BillingProfile = {
    userId,
    tier: 'free',
    alertsLimit: 5,
    watchlistLimit: 2,
    apiRequestsPerMinute: 30,
  };

  billingProfiles.set(userId, created);
  return created;
}

export function updateBillingTier(userId: string, tier: SubscriptionTier): BillingProfile {
  const config: Record<SubscriptionTier, Omit<BillingProfile, 'userId' | 'tier'>> = {
    free: { alertsLimit: 5, watchlistLimit: 2, apiRequestsPerMinute: 30 },
    pro: { alertsLimit: 50, watchlistLimit: 10, apiRequestsPerMinute: 120 },
    premium: { alertsLimit: 250, watchlistLimit: 50, apiRequestsPerMinute: 600 },
  };

  const profile: BillingProfile = {
    userId,
    tier,
    ...config[tier],
  };

  billingProfiles.set(userId, profile);
  return profile;
}
