// app.js — Application orchestrator

import { createPosition, closePosition, expirePosition } from './models.js';
import { Storage } from './storage.js';
import { fetchQuoteBatch, setManualQuote, getAllCachedQuotes, isMarketOpen } from './api.js';
import { renderAllPositionCards, renderClosedPositions } from './ui-positions.js';
import { renderPortfolioSummary, calcPortfolioMetrics } from './ui-portfolio.js';
import { renderGoals, renderProjectionResults, bindProjectionInputs } from './ui-goals.js';
import { destroyAllCharts } from './ui-charts.js';

// ─── State ───────────────────────────────────────────────────────
let positions = [];
let closedPositions = [];
let goals = [];
let refreshInterval = null;

// ─── Helpers ─────────────────────────────────────────────────────
function getUniqueTickers() {
  return [...new Set(positions.map(p => p.ticker))];
}

function getTotalPnL() {
  const metrics = calcPortfolioMetrics(positions, closedPositions, getAllCachedQuotes());
  return metrics.totalPnL;
}

// ─── Render Everything ───────────────────────────────────────────
function renderAll() {
  const quotes = getAllCachedQuotes();

  destroyAllCharts();

  renderAllPositionCards(positions, quotes, {
    onClose: handleOpenCloseModal,
    onDelete: handleDeletePosition,
    onManualPrice: handleManualPrice
  });

  renderClosedPositions(closedPositions);

  const metrics = renderPortfolioSummary(positions, closedPositions, quotes);

  renderGoals(goals, metrics.totalPnL);
  renderProjectionResults(goals, metrics.totalPnL);

  updateMarketStatus();
}

// ─── Price Refresh ───────────────────────────────────────────────
async function refreshPrices() {
  const apiKey = Storage.loadApiKey();
  if (!apiKey) return;

  const tickers = getUniqueTickers();
  if (tickers.length === 0) return;

  const btn = document.getElementById('btn-refresh');
  btn.textContent = '↻ Loading...';
  btn.disabled = true;

  await fetchQuoteBatch(tickers, apiKey);

  btn.textContent = '↻ Refresh';
  btn.disabled = false;

  renderAll();
}

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (isMarketOpen()) {
      refreshPrices();
    }
  }, 60000);
}

function updateMarketStatus() {
  const el = document.getElementById('market-status');
  if (isMarketOpen()) {
    el.textContent = 'Market Open';
    el.className = 'market-badge open';
  } else {
    el.textContent = 'Market Closed';
    el.className = 'market-badge closed';
  }
}

// ─── Position CRUD ───────────────────────────────────────────────
function handleAddPosition(e) {
  e.preventDefault();

  try {
    const pos = createPosition({
      ticker: document.getElementById('inp-ticker').value,
      optionType: document.getElementById('inp-type').value,
      strikePrice: document.getElementById('inp-strike').value,
      premiumPaid: document.getElementById('inp-premium').value,
      contracts: document.getElementById('inp-contracts').value,
      expirationDate: document.getElementById('inp-expiry').value,
      entryDate: document.getElementById('inp-entry').value || undefined,
      targetPrice: document.getElementById('inp-target').value || undefined
    });

    positions.push(pos);
    Storage.savePositions(positions);

    // Reset form
    e.target.reset();

    // Fetch price for new ticker
    const apiKey = Storage.loadApiKey();
    if (apiKey) {
      fetchQuoteBatch([pos.ticker], apiKey).then(() => renderAll());
    } else {
      renderAll();
    }
  } catch (err) {
    alert('Error adding position: ' + err.message);
  }
}

function handleDeletePosition(positionId) {
  if (!confirm('Delete this position? This cannot be undone.')) return;

  positions = positions.filter(p => p.id !== positionId);
  Storage.savePositions(positions);
  renderAll();
}

// ─── Close Position Modal ────────────────────────────────────────
let closingPosition = null;

function handleOpenCloseModal(position) {
  closingPosition = position;
  const modal = document.getElementById('close-modal');
  const info = document.getElementById('close-modal-info');
  const typeStr = position.optionType === 'CALL' ? 'Call' : 'Put';
  info.textContent = `${position.ticker} $${position.strikePrice} ${typeStr} · ${position.contracts} contract(s) · Premium paid: $${position.premiumPaid}/share`;
  document.getElementById('inp-exit-premium').value = '';
  modal.classList.remove('hidden');
}

function handleClosePosition() {
  if (!closingPosition) return;
  const exitPremium = parseFloat(document.getElementById('inp-exit-premium').value);
  if (isNaN(exitPremium) || exitPremium < 0) {
    alert('Please enter a valid exit premium.');
    return;
  }

  const closed = closePosition(closingPosition, exitPremium);
  positions = positions.filter(p => p.id !== closingPosition.id);
  closedPositions.push(closed);

  Storage.savePositions(positions);
  Storage.saveClosedPositions(closedPositions);

  closingPosition = null;
  document.getElementById('close-modal').classList.add('hidden');
  renderAll();
}

function handleExpirePosition() {
  if (!closingPosition) return;

  const expired = expirePosition(closingPosition);
  positions = positions.filter(p => p.id !== closingPosition.id);
  closedPositions.push(expired);

  Storage.savePositions(positions);
  Storage.saveClosedPositions(closedPositions);

  closingPosition = null;
  document.getElementById('close-modal').classList.add('hidden');
  renderAll();
}

// ─── Manual Price ────────────────────────────────────────────────
function handleManualPrice(ticker, price) {
  setManualQuote(ticker, price);
  renderAll();
}

// ─── Settings Modal ──────────────────────────────────────────────
function handleOpenSettings() {
  const modal = document.getElementById('settings-modal');
  document.getElementById('inp-api-key').value = Storage.loadApiKey();
  modal.classList.remove('hidden');
}

function handleSaveApiKey() {
  const key = document.getElementById('inp-api-key').value.trim();
  Storage.saveApiKey(key);
  document.getElementById('settings-modal').classList.add('hidden');
  if (key) {
    refreshPrices();
  }
}

// ─── Form Toggle ─────────────────────────────────────────────────
function handleToggleForm() {
  const form = document.getElementById('position-form');
  const btn = document.getElementById('btn-toggle-form');
  form.classList.toggle('collapsed');
  btn.innerHTML = form.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
}

// ─── Init ────────────────────────────────────────────────────────
function init() {
  Storage.init();

  // Load state
  positions = Storage.loadPositions();
  closedPositions = Storage.loadClosedPositions();
  goals = Storage.loadGoals();

  // Set default entry date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inp-entry').value = today;

  // Set min expiry to today
  document.getElementById('inp-expiry').min = today;

  // Bind events
  document.getElementById('position-form').addEventListener('submit', handleAddPosition);
  document.getElementById('btn-refresh').addEventListener('click', refreshPrices);
  document.getElementById('btn-settings').addEventListener('click', handleOpenSettings);
  document.getElementById('btn-save-api-key').addEventListener('click', handleSaveApiKey);
  document.getElementById('btn-toggle-form').addEventListener('click', handleToggleForm);

  // Close modal events
  document.getElementById('btn-confirm-close').addEventListener('click', handleClosePosition);
  document.getElementById('btn-mark-expired').addEventListener('click', handleExpirePosition);
  document.getElementById('btn-close-modal-x').addEventListener('click', () => {
    document.getElementById('close-modal').classList.add('hidden');
    closingPosition = null;
  });

  // Settings modal close
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
        closingPosition = null;
      }
    });
  });

  // Bind projection calculator inputs
  bindProjectionInputs(goals, getTotalPnL);

  // Initial render
  renderAll();

  // Fetch prices if API key exists
  const apiKey = Storage.loadApiKey();
  if (apiKey && positions.length > 0) {
    refreshPrices();
  }

  // Start auto-refresh
  startAutoRefresh();

  // Hide closed section if empty
  if (closedPositions.length === 0) {
    document.getElementById('closed-section').classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);
