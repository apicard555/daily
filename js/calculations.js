// calculations.js — All financial math, pure functions

export function calcBreakeven(strike, premium, optionType = 'CALL') {
  if (optionType === 'CALL') return strike + premium;
  return strike - premium;
}

export function calcIntrinsicValue(currentPrice, strike, optionType = 'CALL') {
  if (optionType === 'CALL') return Math.max(0, currentPrice - strike);
  return Math.max(0, strike - currentPrice);
}

export function isInTheMoney(currentPrice, strike, optionType = 'CALL') {
  if (optionType === 'CALL') return currentPrice > strike;
  return currentPrice < strike;
}

export function calcMaxLoss(premium, contracts) {
  return premium * contracts * 100;
}

export function calcProfitAtPrice(targetPrice, strike, premium, contracts, optionType = 'CALL') {
  let intrinsic;
  if (optionType === 'CALL') {
    intrinsic = Math.max(0, targetPrice - strike);
  } else {
    intrinsic = Math.max(0, strike - targetPrice);
  }
  const profitPerShare = intrinsic - premium;
  return profitPerShare * contracts * 100;
}

export function calcDaysToExpiration(expirationDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate + 'T00:00:00');
  const diffMs = expiry - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function calcTodayReturn(currentPrice, previousClose) {
  if (!previousClose || previousClose === 0) return { dollarChange: 0, percentChange: 0 };
  const dollarChange = currentPrice - previousClose;
  const percentChange = (dollarChange / previousClose) * 100;
  return { dollarChange, percentChange };
}

export function calcEstimatedOptionValue(currentPrice, strike, premium, daysToExpiration, optionType = 'CALL') {
  const intrinsic = calcIntrinsicValue(currentPrice, strike, optionType);

  // Approximate time value decay using sqrt of time remaining
  // Assumes ~30-day baseline for normalization
  const timeDecayFactor = daysToExpiration > 0
    ? Math.sqrt(daysToExpiration / 30)
    : 0;

  // Original time value = premium paid minus whatever intrinsic was at entry
  // Since we don't have entry price, use full premium as upper-bound time value
  const originalTimeValue = Math.max(0, premium - Math.max(0, intrinsic));
  const estimatedTimeValue = originalTimeValue * Math.min(1, timeDecayFactor);

  return Math.max(0, intrinsic + estimatedTimeValue);
}

export function calcPositionPnL(position, currentPrice) {
  const estimatedValue = calcEstimatedOptionValue(
    currentPrice,
    position.strikePrice,
    position.premiumPaid,
    calcDaysToExpiration(position.expirationDate),
    position.optionType
  );
  const pnlPerShare = estimatedValue - position.premiumPaid;
  return pnlPerShare * position.contracts * 100;
}

export function calcProjectionRange(currentPrice, strike, premium, contracts, optionType = 'CALL') {
  const breakeven = calcBreakeven(strike, premium, optionType);
  const lowerBound = Math.min(currentPrice, strike) * 0.90;
  const upperBound = Math.max(currentPrice, strike, breakeven) * 1.30;
  const step = (upperBound - lowerBound) / 50;

  const points = [];
  for (let price = lowerBound; price <= upperBound; price += step) {
    points.push({
      underlyingPrice: parseFloat(price.toFixed(2)),
      profit: calcProfitAtPrice(price, strike, premium, contracts, optionType),
      isAboveBreakeven: optionType === 'CALL' ? price > breakeven : price < breakeven
    });
  }
  return points;
}

export function calcGoalProgress(totalPnL, goalAmount) {
  const remaining = Math.max(0, goalAmount - totalPnL);
  const percentComplete = goalAmount > 0 ? Math.min(100, (Math.max(0, totalPnL) / goalAmount) * 100) : 0;
  return { remaining, percentComplete };
}

export function calcContractsNeeded(goalRemaining, avgReturnPercent, avgPremium) {
  if (avgReturnPercent <= 0 || avgPremium <= 0) return { contractsNeeded: Infinity, totalCapitalRequired: Infinity, profitPerContract: 0 };

  const profitPerContract = avgPremium * 100 * (avgReturnPercent / 100);
  const contractsNeeded = Math.ceil(goalRemaining / profitPerContract);
  const totalCapitalRequired = contractsNeeded * avgPremium * 100;

  return {
    contractsNeeded,
    totalCapitalRequired,
    profitPerContract
  };
}

export function calcTotalInvested(positions) {
  return positions.reduce((sum, p) => sum + (p.premiumPaid * p.contracts * 100), 0);
}

export function calcWinRate(closedPositions) {
  if (closedPositions.length === 0) return 0;
  const wins = closedPositions.filter(p => p.realizedPnL > 0).length;
  return (wins / closedPositions.length) * 100;
}
