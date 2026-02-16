# Eclipse Eq — Options Trading Dashboard

A client-side options trading dashboard for tracking call option positions, projecting profit/loss, and monitoring progress toward earnings goals.

## Setup

1. **Get a free Finnhub API key** at [finnhub.io/register](https://finnhub.io/register)
2. Open `index.html` in your browser
3. Click **Settings** and paste your API key
4. Start adding positions

No install or build step required — works directly in any modern browser.

## Deploy to GitHub Pages

```bash
cd options-dashboard
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/eclipse-eq-options.git
git push -u origin main
```

Then go to **Settings > Pages > Deploy from branch: main** in your GitHub repo. Your dashboard will be live at `https://YOUR_USERNAME.github.io/eclipse-eq-options/`.

## Features

- **Position tracking**: Add call/put options with strike, premium, contracts, and expiration
- **Live prices**: Auto-fetches stock quotes via Finnhub (60s refresh during market hours)
- **Per-position cards**: Current price, breakeven, ITM/OTM status, days to expiry, max loss, estimated P&L
- **Profit projection slider**: Drag to see profit/loss at any underlying price at expiration
- **Profit chart**: Visual P&L curve per position
- **Goal tracker**: Track progress toward $50K and $100K targets with progress bars
- **Projection calculator**: Calculates how many contracts you need to trade to hit your goals
- **Portfolio summary**: Total invested, current value, unrealized P&L, win rate
- **Data persistence**: All data saved in browser localStorage
- **Manual price fallback**: Enter prices manually if no API key

## Notes

- Option values shown are **estimates** based on intrinsic value + time decay approximation (not real-time option chain prices). Profit projections at expiration are exact.
- Data is stored locally in your browser. Use the same browser to retain your data.
