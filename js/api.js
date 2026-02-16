// api.js — Finnhub API integration with manual fallback

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const quoteCache = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchQuote(ticker, apiKey) {
  if (!apiKey) return null;

  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Finnhub returns zeros for invalid tickers
    if (data.c === 0 && data.pc === 0) {
      throw new Error(`No data for ticker ${ticker}`);
    }

    const quote = {
      current: data.c,
      previousClose: data.pc,
      open: data.o,
      high: data.h,
      low: data.l,
      change: data.d,
      changePercent: data.dp,
      timestamp: data.t,
      lastFetched: Date.now(),
      source: 'finnhub'
    };

    quoteCache.set(ticker, quote);
    return quote;
  } catch (error) {
    console.warn(`Finnhub fetch failed for ${ticker}:`, error.message);
    return null;
  }
}

export async function fetchQuoteBatch(tickers, apiKey) {
  const quotes = {};
  const uniqueTickers = [...new Set(tickers)];

  for (let i = 0; i < uniqueTickers.length; i++) {
    if (i > 0) await sleep(120); // Stay under 60/min rate limit

    const quote = await fetchQuote(uniqueTickers[i], apiKey);
    if (quote) {
      quotes[uniqueTickers[i]] = quote;
    }
  }
  return quotes;
}

export function setManualQuote(ticker, currentPrice) {
  const quote = {
    current: parseFloat(currentPrice),
    previousClose: parseFloat(currentPrice),
    open: parseFloat(currentPrice),
    high: parseFloat(currentPrice),
    low: parseFloat(currentPrice),
    change: 0,
    changePercent: 0,
    timestamp: Math.floor(Date.now() / 1000),
    lastFetched: Date.now(),
    source: 'manual'
  };
  quoteCache.set(ticker, quote);
  return quote;
}

export function getCachedQuote(ticker) {
  return quoteCache.get(ticker) || null;
}

export function getAllCachedQuotes() {
  const quotes = {};
  quoteCache.forEach((quote, ticker) => {
    quotes[ticker] = quote;
  });
  return quotes;
}

export function isMarketOpen() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  // Convert to ET (approximate — doesn't handle DST perfectly)
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const etMinutes = (utcHour - 5) * 60 + utcMin; // EST offset
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;     // 4:00 PM

  return etMinutes >= marketOpen && etMinutes < marketClose;
}
