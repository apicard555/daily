// ui-portfolio.js — Portfolio summary bar

import { calcTotalInvested, calcPositionPnL, calcWinRate, calcEstimatedOptionValue, calcDaysToExpiration } from './calculations.js';

function fmt(n, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function calcPortfolioMetrics(positions, closedPositions, quotes) {
  const totalInvested = calcTotalInvested(positions);

  let totalCurrentValue = 0;
  let unrealizedPnL = 0;

  positions.forEach(pos => {
    const quote = quotes[pos.ticker];
    if (quote && quote.current > 0) {
      const estValue = calcEstimatedOptionValue(
        quote.current,
        pos.strikePrice,
        pos.premiumPaid,
        calcDaysToExpiration(pos.expirationDate),
        pos.optionType
      );
      const posCurrentValue = estValue * pos.contracts * 100;
      totalCurrentValue += posCurrentValue;
      unrealizedPnL += calcPositionPnL(pos, quote.current);
    } else {
      // No quote — assume at cost
      totalCurrentValue += pos.premiumPaid * pos.contracts * 100;
    }
  });

  const realizedPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
  const winRate = calcWinRate(closedPositions);

  return {
    totalInvested,
    totalCurrentValue,
    unrealizedPnL,
    realizedPnL,
    totalPnL: unrealizedPnL + realizedPnL,
    winRate,
    closedCount: closedPositions.length
  };
}

export function renderPortfolioSummary(positions, closedPositions, quotes) {
  const metrics = calcPortfolioMetrics(positions, closedPositions, quotes);

  const investedEl = document.getElementById('total-invested');
  const valueEl = document.getElementById('total-value');
  const pnlEl = document.getElementById('total-pnl');
  const winRateEl = document.getElementById('win-rate');

  investedEl.textContent = `$${fmt(metrics.totalInvested)}`;

  valueEl.textContent = `$${fmt(metrics.totalCurrentValue)}`;

  const pnlSign = metrics.unrealizedPnL >= 0 ? '+' : '-';
  const pctSign = metrics.unrealizedPnL >= 0 ? '+' : '-';
  const pnlPct = metrics.totalInvested > 0
    ? ` (${pctSign}${fmt(Math.abs((metrics.unrealizedPnL / metrics.totalInvested) * 100), 1)}%)`
    : '';
  pnlEl.textContent = `${pnlSign}$${fmt(Math.abs(metrics.unrealizedPnL))}${pnlPct}`;
  pnlEl.className = 'summary-value mono ' + (metrics.unrealizedPnL >= 0 ? 'text-green' : 'text-red');

  if (metrics.closedCount > 0) {
    winRateEl.textContent = `${fmt(metrics.winRate, 0)}% (${metrics.closedCount} trades)`;
  } else {
    winRateEl.textContent = '—';
  }

  return metrics;
}
