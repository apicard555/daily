// ui-charts.js — Chart.js configurations for profit curves, goal progress, portfolio

const chartInstances = new Map();

function destroyIfExists(canvasId) {
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
    chartInstances.delete(canvasId);
  }
}

export function createProfitChart(canvasElement, projectionPoints, breakeven) {
  const canvasId = canvasElement.id;
  destroyIfExists(canvasId);

  const labels = projectionPoints.map(p => p.underlyingPrice.toFixed(1));
  const data = projectionPoints.map(p => p.profit);
  const colors = projectionPoints.map(p => p.profit >= 0 ? 'rgba(63, 185, 80, 0.8)' : 'rgba(248, 81, 73, 0.8)');

  const chart = new Chart(canvasElement, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Profit / Loss ($)',
        data,
        borderColor: 'rgba(88, 166, 255, 1)',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 8,
        borderWidth: 2,
        segment: {
          borderColor: ctx => {
            const val = ctx.p1.parsed.y;
            return val >= 0 ? 'rgba(63, 185, 80, 1)' : 'rgba(248, 81, 73, 1)';
          },
          backgroundColor: ctx => {
            const val = ctx.p1.parsed.y;
            return val >= 0 ? 'rgba(63, 185, 80, 0.08)' : 'rgba(248, 81, 73, 0.08)';
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Underlying: $${items[0].label}`,
            label: (item) => {
              const val = item.parsed.y;
              const sign = val >= 0 ? '+' : '';
              return `P&L: ${sign}$${val.toFixed(2)}`;
            }
          },
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#e6edf3',
          bodyColor: '#e6edf3',
          bodyFont: { family: "'SF Mono', Consolas, monospace" }
        },
        annotation: breakeven ? {
          annotations: {
            breakevenLine: {
              type: 'line',
              xMin: breakeven.toFixed(1),
              xMax: breakeven.toFixed(1),
              borderColor: 'rgba(210, 153, 34, 0.6)',
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                content: 'BE',
                display: true,
                color: '#d29922',
                font: { size: 10 }
              }
            }
          }
        } : {}
      },
      scales: {
        x: {
          display: true,
          grid: { color: 'rgba(48, 54, 61, 0.5)' },
          ticks: { color: '#6e7681', font: { size: 9 }, maxTicksLimit: 6 },
          title: { display: false }
        },
        y: {
          display: true,
          grid: { color: 'rgba(48, 54, 61, 0.5)' },
          ticks: {
            color: '#6e7681',
            font: { size: 9, family: "'SF Mono', Consolas, monospace" },
            callback: val => (val >= 0 ? '+' : '') + '$' + val.toFixed(0)
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

export function destroyAllCharts() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances.clear();
}
