// models.js — Data structures for positions, closed positions, and goals

export const OptionType = Object.freeze({
  CALL: 'CALL',
  PUT: 'PUT'
});

export const PositionStatus = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  EXPIRED: 'EXPIRED'
});

export function createPosition({ ticker, optionType = OptionType.CALL, strikePrice, premiumPaid, contracts, expirationDate, entryDate, targetPrice = null, notes = '' }) {
  if (!ticker || !strikePrice || !premiumPaid || !contracts || !expirationDate) {
    throw new Error('Missing required fields: ticker, strikePrice, premiumPaid, contracts, expirationDate');
  }

  return {
    id: 'pos_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    ticker: ticker.toUpperCase().trim(),
    optionType,
    strikePrice: parseFloat(strikePrice),
    premiumPaid: parseFloat(premiumPaid),
    contracts: parseInt(contracts, 10),
    expirationDate,
    entryDate: entryDate || new Date().toISOString().split('T')[0],
    targetPrice: targetPrice ? parseFloat(targetPrice) : null,
    notes,
    status: PositionStatus.OPEN
  };
}

export function closePosition(position, exitPremium) {
  const exit = parseFloat(exitPremium);
  const realizedPnL = (exit - position.premiumPaid) * position.contracts * 100;

  return {
    ...position,
    status: PositionStatus.CLOSED,
    exitDate: new Date().toISOString().split('T')[0],
    exitPremium: exit,
    realizedPnL
  };
}

export function expirePosition(position) {
  const realizedPnL = -position.premiumPaid * position.contracts * 100;

  return {
    ...position,
    status: PositionStatus.EXPIRED,
    exitDate: position.expirationDate,
    exitPremium: 0,
    realizedPnL
  };
}

export function createGoal({ id, name, targetAmount, targetDate }) {
  return {
    id,
    name,
    targetAmount: parseFloat(targetAmount),
    targetDate,
    createdDate: new Date().toISOString().split('T')[0]
  };
}

export const DEFAULT_GOALS = [
  { id: 'goal_1', name: '$50K by March 15', targetAmount: 50000, targetDate: '2026-03-15', createdDate: '2026-02-15' },
  { id: 'goal_2', name: '$100K by April 15', targetAmount: 100000, targetDate: '2026-04-15', createdDate: '2026-02-15' }
];
