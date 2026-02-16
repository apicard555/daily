// ui-goals.js — Goal tracker + projection calculator

import { calcGoalProgress, calcContractsNeeded, calcDaysToExpiration } from './calculations.js';

function fmt(n, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function renderGoals(goals, totalPnL) {
  const grid = document.getElementById('goals-grid');
  grid.innerHTML = '';

  goals.forEach(goal => {
    const progress = calcGoalProgress(totalPnL, goal.targetAmount);
    const daysLeft = calcDaysToExpiration(goal.targetDate);
    const dailyNeeded = daysLeft > 0 ? progress.remaining / daysLeft : progress.remaining;

    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-name">${goal.name}</div>
      <div class="goal-meta">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining · Target: $${fmtInt(goal.targetAmount)}</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${Math.min(100, progress.percentComplete)}%"></div>
      </div>
      <div class="goal-stats">
        <span>Progress: <span class="mono ${progress.percentComplete > 0 ? 'text-green' : ''}">${fmt(progress.percentComplete, 1)}%</span></span>
        <span>Remaining: <span class="mono">$${fmtInt(progress.remaining)}</span></span>
      </div>
      ${daysLeft > 0 ? `<div class="goal-stats" style="margin-top:4px"><span>Daily target: <span class="mono text-blue">$${fmtInt(dailyNeeded)}/day</span></span></div>` : ''}
    `;
    grid.appendChild(card);
  });
}

export function renderProjectionResults(goals, totalPnL) {
  const returnInput = document.getElementById('proj-return');
  const premiumInput = document.getElementById('proj-premium');
  const resultsDiv = document.getElementById('projection-results');

  const avgReturn = parseFloat(returnInput.value) || 0;
  const avgPremium = parseFloat(premiumInput.value) || 0;

  if (avgReturn <= 0 || avgPremium <= 0) {
    resultsDiv.innerHTML = '<span class="text-muted">Enter valid return % and premium to see projections.</span>';
    return;
  }

  let html = '';

  goals.forEach(goal => {
    const progress = calcGoalProgress(totalPnL, goal.targetAmount);
    if (progress.remaining <= 0) {
      html += `<div style="margin-bottom:10px"><strong>${goal.name}</strong>: <span class="text-green">Goal reached!</span></div>`;
      return;
    }

    const projection = calcContractsNeeded(progress.remaining, avgReturn, avgPremium);
    const daysLeft = calcDaysToExpiration(goal.targetDate);
    const profitPerContract = projection.profitPerContract;

    html += `
      <div style="margin-bottom:12px">
        <strong>${goal.name}</strong> — <span class="mono">$${fmtInt(progress.remaining)}</span> remaining<br>
        Profit per contract at ${avgReturn}% return: <span class="highlight">$${fmt(profitPerContract)}</span><br>
        Contracts needed: <span class="highlight">${fmtInt(projection.contractsNeeded)}</span>
        (capital required: <span class="highlight">$${fmtInt(projection.totalCapitalRequired)}</span>)<br>
        ${daysLeft > 0 ? `At ~5 contracts/trade: <span class="highlight">${Math.ceil(projection.contractsNeeded / 5)} trades</span> over ${daysLeft} days (~${fmt(Math.ceil(projection.contractsNeeded / 5) / Math.max(1, Math.floor(daysLeft / 7)), 1)} trades/week)` : ''}
      </div>
    `;
  });

  resultsDiv.innerHTML = html || '<span class="text-muted">No active goals.</span>';
}

export function bindProjectionInputs(goals, getTotalPnL) {
  const returnInput = document.getElementById('proj-return');
  const premiumInput = document.getElementById('proj-premium');

  function update() {
    renderProjectionResults(goals, getTotalPnL());
  }

  returnInput.addEventListener('input', update);
  premiumInput.addEventListener('input', update);

  // Initial render
  update();
}
