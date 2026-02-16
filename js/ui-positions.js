// ui-positions.js — Position form + dashboard cards + profit slider

import {
  calcBreakeven, calcIntrinsicValue, isInTheMoney, calcMaxLoss,
  calcProfitAtPrice, calcDaysToExpiration, calcTodayReturn,
  calcEstimatedOptionValue, calcPositionPnL, calcProjectionRange
} from './calculations.js';
import { createProfitChart } from './ui-charts.js';
import { setManualQuote } from './api.js';

function fmt(n, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDollar(n) {
  const sign = n >= 0 ? '+' : '-';
  return `${sign}$${fmt(Math.abs(n))}`;
}

function fmtPct(n) {
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${fmt(n)}%`;
}

export function renderPositionCard(position, quote, { onClose, onDelete, onManualPrice }) {
  const card = document.createElement('div');
  card.className = 'position-card';
  card.dataset.positionId = position.id;

  const hasQuote = quote && quote.current > 0;
  const currentPrice = hasQuote ? quote.current : 0;
  const breakeven = calcBreakeven(position.strikePrice, position.premiumPaid, position.optionType);
  const dte = calcDaysToExpiration(position.expirationDate);
  const maxLoss = calcMaxLoss(position.premiumPaid, position.contracts);
  const itm = hasQuote && isInTheMoney(currentPrice, position.strikePrice, position.optionType);

  if (hasQuote) {
    card.classList.add(itm ? 'itm' : 'otm');
  }

  // Today's return
  const todayReturn = hasQuote ? calcTodayReturn(quote.current, quote.previousClose) : null;

  // Estimated P&L
  const estPnL = hasQuote ? calcPositionPnL(position, currentPrice) : 0;

  // Description line
  const typeStr = position.optionType === 'CALL' ? 'C' : 'P';
  const expiryShort = new Date(position.expirationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let html = `
    <div class="card-header">
      <div>
        <div class="card-ticker">${position.ticker}</div>
        <div class="card-desc">$${fmt(position.strikePrice)}${typeStr} · ${expiryShort} · ${position.contracts} contract${position.contracts > 1 ? 's' : ''}</div>
      </div>
      <div>
        ${hasQuote ? `<span class="badge ${itm ? 'badge-itm' : 'badge-otm'}">${itm ? 'ITM' : 'OTM'}</span>` : ''}
        ${dte <= 7 && dte > 0 ? '<span class="badge badge-expired" style="margin-left:4px">Expiring Soon</span>' : ''}
        ${dte === 0 ? '<span class="badge badge-expired" style="margin-left:4px">Expires Today</span>' : ''}
      </div>
    </div>

    <div class="card-metrics">
      <div class="metric">
        <span class="metric-label">Current Price</span>
        <span class="metric-value">${hasQuote ? '$' + fmt(currentPrice) : '—'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Breakeven</span>
        <span class="metric-value">$${fmt(breakeven)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Today's Move</span>
        <span class="metric-value ${todayReturn ? (todayReturn.dollarChange >= 0 ? 'text-green' : 'text-red') : ''}">${todayReturn ? fmtDollar(todayReturn.dollarChange) + ' (' + fmtPct(todayReturn.percentChange) + ')' : '—'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Days to Expiry</span>
        <span class="metric-value ${dte <= 7 ? 'text-red' : ''}">${dte} day${dte !== 1 ? 's' : ''}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Max Loss</span>
        <span class="metric-value text-red">-$${fmt(maxLoss)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Est. P&L</span>
        <span class="metric-value ${estPnL >= 0 ? 'text-green' : 'text-red'}">${hasQuote ? fmtDollar(estPnL) : '—'}</span>
      </div>
      ${position.targetPrice ? `
      <div class="metric">
        <span class="metric-label">Target Price</span>
        <span class="metric-value">$${fmt(position.targetPrice)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Profit at Target</span>
        <span class="metric-value text-green">${fmtDollar(calcProfitAtPrice(position.targetPrice, position.strikePrice, position.premiumPaid, position.contracts, position.optionType))}</span>
      </div>
      ` : ''}
    </div>
  `;

  // Manual price entry if no quote
  if (!hasQuote) {
    html += `
      <div class="manual-price">
        <div class="input-group" style="flex:1">
          <label>Enter Current Price</label>
          <input type="number" class="manual-price-input" step="0.01" min="0" placeholder="0.00">
        </div>
        <button class="btn btn-sm btn-primary manual-price-btn" style="margin-top:auto">Set</button>
      </div>
    `;
  }

  // Profit projection slider
  if (hasQuote || true) {
    const sliderMin = Math.floor(Math.min(currentPrice || position.strikePrice * 0.9, position.strikePrice) * 0.85);
    const sliderMax = Math.ceil(Math.max(currentPrice || position.strikePrice * 1.1, position.strikePrice, breakeven) * 1.35);
    const sliderDefault = hasQuote ? currentPrice : position.strikePrice;
    const profitAtDefault = calcProfitAtPrice(sliderDefault, position.strikePrice, position.premiumPaid, position.contracts, position.optionType);

    html += `
      <div class="slider-section">
        <div class="slider-header">
          <span class="slider-label">Price Projection (at expiration)</span>
          <span class="slider-value">
            <span class="slider-price">$${fmt(sliderDefault)}</span>
            → <span class="slider-pnl ${profitAtDefault >= 0 ? 'text-green' : 'text-red'}">${fmtDollar(profitAtDefault)}</span>
          </span>
        </div>
        <input type="range" class="profit-slider" min="${sliderMin}" max="${sliderMax}" value="${sliderDefault}" step="0.5">
        <div class="card-chart">
          <canvas id="chart-${position.id}"></canvas>
        </div>
      </div>
    `;
  }

  // Actions
  html += `
    <div class="card-actions">
      <button class="btn btn-sm btn-outline btn-close-pos">Close Position</button>
      <button class="btn btn-sm btn-danger btn-delete-pos">Delete</button>
    </div>
  `;

  card.innerHTML = html;

  // Bind slider
  const slider = card.querySelector('.profit-slider');
  if (slider) {
    slider.addEventListener('input', () => {
      const price = parseFloat(slider.value);
      const profit = calcProfitAtPrice(price, position.strikePrice, position.premiumPaid, position.contracts, position.optionType);
      card.querySelector('.slider-price').textContent = `$${fmt(price)}`;
      const pnlEl = card.querySelector('.slider-pnl');
      pnlEl.textContent = fmtDollar(profit);
      pnlEl.className = 'slider-pnl ' + (profit >= 0 ? 'text-green' : 'text-red');
    });
  }

  // Bind chart
  requestAnimationFrame(() => {
    const canvas = card.querySelector(`#chart-${position.id}`);
    if (canvas) {
      const refPrice = hasQuote ? currentPrice : position.strikePrice;
      const points = calcProjectionRange(refPrice, position.strikePrice, position.premiumPaid, position.contracts, position.optionType);
      createProfitChart(canvas, points, breakeven);
    }
  });

  // Bind manual price
  const manualBtn = card.querySelector('.manual-price-btn');
  if (manualBtn) {
    manualBtn.addEventListener('click', () => {
      const input = card.querySelector('.manual-price-input');
      const val = parseFloat(input.value);
      if (val > 0) {
        onManualPrice(position.ticker, val);
      }
    });
  }

  // Bind close
  card.querySelector('.btn-close-pos').addEventListener('click', () => onClose(position));

  // Bind delete
  card.querySelector('.btn-delete-pos').addEventListener('click', () => onDelete(position.id));

  return card;
}

export function renderAllPositionCards(positions, quotes, callbacks) {
  const grid = document.getElementById('positions-grid');
  const empty = document.getElementById('no-positions');

  grid.innerHTML = '';

  if (positions.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  positions.forEach(pos => {
    const quote = quotes[pos.ticker] || null;
    const card = renderPositionCard(pos, quote, callbacks);
    grid.appendChild(card);
  });
}

export function renderClosedPositions(closedPositions) {
  const grid = document.getElementById('closed-grid');
  const empty = document.getElementById('no-closed');

  grid.innerHTML = '';

  if (closedPositions.length === 0) {
    empty.classList.remove('hidden');
    document.getElementById('closed-section').classList.add('hidden');
    return;
  }

  document.getElementById('closed-section').classList.remove('hidden');
  empty.classList.add('hidden');

  closedPositions.forEach(pos => {
    const div = document.createElement('div');
    div.className = 'closed-card';
    const typeStr = pos.optionType === 'CALL' ? 'C' : 'P';
    const pnlClass = pos.realizedPnL >= 0 ? 'text-green' : 'text-red';
    const pnlSign = pos.realizedPnL >= 0 ? '+' : '';

    div.innerHTML = `
      <div class="closed-info">
        <span class="closed-ticker">${pos.ticker} $${fmt(pos.strikePrice)}${typeStr}</span>
        <span class="closed-details">${pos.status === 'EXPIRED' ? 'Expired' : 'Closed'} ${pos.exitDate} · ${pos.contracts} contract${pos.contracts > 1 ? 's' : ''}</span>
      </div>
      <span class="closed-pnl ${pnlClass}">${pnlSign}$${fmt(Math.abs(pos.realizedPnL))}</span>
    `;
    grid.appendChild(div);
  });
}
