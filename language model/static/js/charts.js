/**
 * Charts Engine Module (Chart.js 4.x)
 * Handles all dashboard visualizations, custom styling, tooltips, and themes.
 */

const ChartsManager = {
  instances: {},

  // Global dark theme configuration for Chart.js
  chartDefaults: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    gridColor: 'rgba(255, 255, 255, 0.06)',
    tickColor: '#94a3b8',
    colors: {
      primary: '#6366f1',
      primaryLight: 'rgba(99, 102, 241, 0.25)',
      emerald: '#10b981',
      emeraldLight: 'rgba(16, 185, 129, 0.25)',
      cyan: '#06b6d4',
      cyanLight: 'rgba(6, 182, 212, 0.25)',
      amber: '#f59e0b',
      amberLight: 'rgba(245, 158, 11, 0.25)',
      purple: '#8b5cf6',
      rose: '#ef4444',
      palette: ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    }
  },

  destroyChart(canvasId) {
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
  },

  // 1. Home Timeline: Demand vs Realized Sales
  renderHomeTimeline(canvasId, monthlyData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !monthlyData || monthlyData.length === 0) return;

    const labels = monthlyData.map(d => d.year_month);
    const demand = monthlyData.map(d => d.total_demand);
    const sales = monthlyData.map(d => d.total_sales);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Market Demand (Units)',
            data: demand,
            borderColor: this.chartDefaults.colors.cyan,
            backgroundColor: this.chartDefaults.colors.cyanLight,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Realized Sales (Units)',
            data: sales,
            borderColor: this.chartDefaults.colors.emerald,
            backgroundColor: this.chartDefaults.colors.emeraldLight,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: this.chartDefaults.tickColor, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: '#131b2e',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: '#22304e',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} units`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor, maxRotation: 45 }
          },
          y: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          }
        }
      }
    });
  },

  // 2. Category Revenue Comparison (Bar Chart)
  renderCategoryBreakdown(canvasId, categoryData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !categoryData || categoryData.length === 0) return;

    const labels = categoryData.map(c => c.category);
    const revenues = categoryData.map(c => c.total_revenue / 100000); // In Lakhs

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (₹ Lakhs)',
          data: revenues,
          backgroundColor: this.chartDefaults.colors.palette.slice(0, labels.length),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Gross Revenue: ₹${(ctx.raw * 100000).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          },
          y: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: {
              color: this.chartDefaults.tickColor,
              callback: (val) => `₹${val}L`
            }
          }
        }
      }
    });
  },

  // 3. Market Trend Donut
  renderMarketTrendDonut(canvasId, trendData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !trendData) return;

    const labels = Object.keys(trendData);
    const counts = Object.values(trendData);

    const colorsMap = {
      'Increasing': this.chartDefaults.colors.emerald,
      'Stable': this.chartDefaults.colors.cyan,
      'Declining': this.chartDefaults.colors.rose
    };

    const bgColors = labels.map(l => colorsMap[l] || this.chartDefaults.colors.primary);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#131b2e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: this.chartDefaults.tickColor, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} products (${Math.round((ctx.raw / counts.reduce((a, b) => a + b, 0)) * 100)}%)`
            }
          }
        }
      }
    });
  },

  // 4. Monthly Revenue Trend (Market Overview)
  renderMonthlyRevenue(canvasId, monthlyData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !monthlyData || monthlyData.length === 0) return;

    const labels = monthlyData.map(d => d.year_month);
    const revenues = monthlyData.map(d => d.total_revenue / 100000); // In Lakhs

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Monthly Revenue (₹ Lakhs)',
          data: revenues,
          backgroundColor: (ctx) => {
            const index = ctx.dataIndex;
            const monthStr = labels[index] || '';
            // Highlight Q4 festivals (October, November, December) in emerald
            if (monthStr.endsWith('-10') || monthStr.endsWith('-11') || monthStr.endsWith('-12')) {
              return this.chartDefaults.colors.emerald;
            }
            return this.chartDefaults.colors.primary;
          },
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Total Revenue: ₹${(ctx.raw * 100000).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor, maxRotation: 45 }
          },
          y: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: {
              color: this.chartDefaults.tickColor,
              callback: (val) => `₹${val}L`
            }
          }
        }
      }
    });
  },

  // 5. Price vs Demand Scatter (Price Elasticity)
  renderPriceVsDemandScatter(canvasId, scatterPoints) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !scatterPoints || scatterPoints.length === 0) return;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Products',
          data: scatterPoints.map(p => ({ x: p.x, y: p.y, product: p.product })),
          backgroundColor: this.chartDefaults.colors.cyan,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = ctx.raw;
                return `${item.product || 'Product'}: Price ₹${item.x.toLocaleString()} | Demand ${item.y.toLocaleString()} units`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Product Price (₹)', color: this.chartDefaults.tickColor },
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          },
          y: {
            title: { display: true, text: 'Market Demand (Units)', color: this.chartDefaults.tickColor },
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          }
        }
      }
    });
  },

  // 6. Rating vs Sales Scatter
  renderRatingVsSalesScatter(canvasId, scatterPoints) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !scatterPoints || scatterPoints.length === 0) return;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Customer Rating vs Sales',
          data: scatterPoints.map(p => ({ x: p.x, y: p.y, product: p.product })),
          backgroundColor: this.chartDefaults.colors.amber,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = ctx.raw;
                return `${item.product || 'Product'}: Rating ${item.x} ★ | Sales ${item.y.toLocaleString()} units`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Customer Rating (Stars)', color: this.chartDefaults.tickColor },
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          },
          y: {
            title: { display: true, text: 'Units Sold', color: this.chartDefaults.tickColor },
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          }
        }
      }
    });
  },

  // 7. Price Elasticity & Revenue Curve (Prediction Dashboard)
  renderPriceElasticityCurve(canvasId, simulations) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !simulations || simulations.length === 0) return;

    const labels = simulations.map(s => `${s.label} (₹${s.price.toLocaleString()})`);
    const revenues = simulations.map(s => s.expected_revenue);
    const sales = simulations.map(s => s.expected_sales);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Expected Revenue (₹)',
            data: revenues,
            borderColor: this.chartDefaults.colors.emerald,
            backgroundColor: this.chartDefaults.colors.emeraldLight,
            yAxisID: 'yRev',
            tension: 0.3,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 9
          },
          {
            label: 'Expected Sales (Units)',
            data: sales,
            borderColor: this.chartDefaults.colors.primary,
            borderDash: [5, 5],
            yAxisID: 'ySales',
            tension: 0.3,
            fill: false,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: this.chartDefaults.tickColor, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.label.includes('Revenue')) {
                  return `Expected Revenue: ₹${ctx.raw.toLocaleString()}`;
                }
                return `Expected Sales: ${ctx.raw.toLocaleString()} units`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          },
          yRev: {
            type: 'linear',
            position: 'left',
            grid: { color: this.chartDefaults.gridColor },
            ticks: {
              color: this.chartDefaults.tickColor,
              callback: (val) => `₹${(val / 1000).toFixed(0)}k`
            }
          },
          ySales: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: this.chartDefaults.tickColor }
          }
        }
      }
    });
  },

  // 8. Actual vs Predicted (Test Set Model Validation)
  renderActualVsPredicted(canvasId, testData, target) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !testData || !testData.actual) return;

    const labels = testData.labels.slice(0, 25);
    const actual = testData.actual.slice(0, 25);
    const rfPred = (testData.predictions['Random Forest'] || []).slice(0, 25);
    const lrPred = (testData.predictions['Linear Regression'] || []).slice(0, 25);
    const dtPred = (testData.predictions['Decision Tree'] || []).slice(0, 25);

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Actual Observed',
            data: actual,
            borderColor: '#f1f5f9',
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.1
          },
          {
            label: 'Random Forest (Best)',
            data: rfPred,
            borderColor: this.chartDefaults.colors.emerald,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.2
          },
          {
            label: 'Decision Tree',
            data: dtPred,
            borderColor: this.chartDefaults.colors.amber,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 2,
            tension: 0.2
          },
          {
            label: 'Linear Regression',
            data: lrPred,
            borderColor: this.chartDefaults.colors.cyan,
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 2,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: this.chartDefaults.tickColor, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} ${target === 'price' ? '₹' : 'units'}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor, maxRotation: 45 }
          },
          y: {
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          }
        }
      }
    });
  },

  // 9. Feature Importance (Horizontal Bar Chart)
  renderFeatureImportance(canvasId, featuresList) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !featuresList || featuresList.length === 0) return;

    const labels = featuresList.map(f => {
      return f.feature
        .replace('category_', 'Category: ')
        .replace('market_trend_', 'Trend: ')
        .replace('_', ' ')
        .toUpperCase();
    });
    const importances = featuresList.map(f => (f.importance * 100).toFixed(1));

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Feature Weight (%)',
          data: importances,
          backgroundColor: this.chartDefaults.colors.primary,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Influence on Demand: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Importance Percentage (%)', color: this.chartDefaults.tickColor },
            grid: { color: this.chartDefaults.gridColor },
            ticks: { color: this.chartDefaults.tickColor }
          },
          y: {
            grid: { display: false },
            ticks: { color: this.chartDefaults.tickColor }
          }
        }
      }
    });
  }
};

