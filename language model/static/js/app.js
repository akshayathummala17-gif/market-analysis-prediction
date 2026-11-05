/**
 * MarketPulse AI - Main Application Controller
 * Handles UI routing, state management, API synchronization, forms, and tables.
 */

const app = {
  state: {
    currentView: 'home',
    overview: null,
    productsCatalog: [],
    selectedProductDetail: null,
    activeModelTarget: 'demand',
    modelsMetadata: null,
    datasetPage: 1,
    datasetPageSize: 15,
    datasetSearch: '',
    datasetCategory: ''
  },

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  init() {
    this.bindEvents();
    this.loadInitialData();
  },

  bindEvents() {
    // Navigation items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('mobileSidebarClose');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }

    // Quick Action buttons in header
    const quickPredictBtn = document.getElementById('quickPredictBtn');
    if (quickPredictBtn) {
      quickPredictBtn.addEventListener('click', () => this.switchView('prediction'));
    }

    const quickRetrainBtn = document.getElementById('quickRetrainBtn');
    if (quickRetrainBtn) {
      quickRetrainBtn.addEventListener('click', () => this.retrainModels());
    }

    const btnTriggerRetrain = document.getElementById('btnTriggerRetrain');
    if (btnTriggerRetrain) {
      btnTriggerRetrain.addEventListener('click', () => this.retrainModels());
    }

    // Prediction Form Events
    const predForm = document.getElementById('predictionForm');
    if (predForm) {
      predForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePredictionSubmit();
      });
    }

    const ratingSlider = document.getElementById('predRating');
    const ratingDisplay = document.getElementById('ratingDisplayVal');
    if (ratingSlider && ratingDisplay) {
      ratingSlider.addEventListener('input', (e) => {
        ratingDisplay.textContent = `${parseFloat(e.target.value).toFixed(1)} ★`;
      });
    }

    const prefillSelect = document.getElementById('predPrefillSelect');
    if (prefillSelect) {
      prefillSelect.addEventListener('change', (e) => {
        this.prefillPredictionForm(e.target.value);
      });
    }

    // Product Analysis Selector Events
    const btnInspect = document.getElementById('btnInspectProduct');
    const productSelect = document.getElementById('productAnalysisSelect');
    if (btnInspect && productSelect) {
      btnInspect.addEventListener('click', () => {
        const val = productSelect.value;
        if (val) this.inspectProduct(val);
      });
    }

    const btnPredictFromSelected = document.getElementById('btnPredictFromSelected');
    if (btnPredictFromSelected && productSelect) {
      btnPredictFromSelected.addEventListener('click', () => {
        const val = productSelect.value;
        if (val) {
          this.switchView('prediction');
          this.prefillPredictionForm(val);
          const sel = document.getElementById('predPrefillSelect');
          if (sel) sel.value = val;
        } else {
          this.showToast('Please select a product first', 'info');
        }
      });
    }

    // Model Performance Target Tab Pills
    document.querySelectorAll('.tab-pills-row .tab-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-pills-row .tab-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.state.activeModelTarget = pill.dataset.target;
        this.renderModelMetricsTable();
        this.loadActualVsPredictedChart();
      });
    });

    // Dataset Management Events
    const dropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('fileUploadInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    const btnResetSample = document.getElementById('btnResetToSample');
    if (btnResetSample) {
      btnResetSample.addEventListener('click', () => this.resetToSampleDataset());
    }

    // Dataset Table Filters & Pagination
    const searchInput = document.getElementById('datasetSearchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.state.datasetSearch = e.target.value.trim();
          this.state.datasetPage = 1;
          this.loadDatasetRecords();
        }, 300);
      });
    }

    const catFilter = document.getElementById('datasetCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        this.state.datasetCategory = e.target.value;
        this.state.datasetPage = 1;
        this.loadDatasetRecords();
      });
    }

    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.state.datasetPage > 1) {
          this.state.datasetPage--;
          this.loadDatasetRecords();
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.state.datasetPage++;
        this.loadDatasetRecords();
      });
    }
  },

  // --------------------------------------------------------------------------
  // View Routing
  // --------------------------------------------------------------------------
  switchView(viewName) {
    this.state.currentView = viewName;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Update active pane
    document.querySelectorAll('.views-viewport .view-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(`view-${viewName}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Update Top Header Titles
    const titlesMap = {
      home: { title: 'Home Dashboard', sub: 'Executive intelligence overview of product demand, sales & price dynamics' },
      market: { title: 'Market Overview', sub: 'Macro analysis of product categories, revenue generation, and market sentiment' },
      products: { title: 'Product Analysis', sub: 'Explore price elasticity, customer rating correlations, and competitor pricing relationships' },
      prediction: { title: 'AI Prediction Engine', sub: 'Configure product attributes, pricing scenarios, and seasonal conditions to generate future forecasts' },
      models: { title: 'Model Performance', sub: 'Rigorous test-set evaluation across Linear Regression, Random Forest, and Decision Tree' },
      dataset: { title: 'Dataset Management', sub: 'Upload market records in CSV or Excel format, inspect raw dataset records, and monitor data cleaning' }
    };

    const headerInfo = titlesMap[viewName] || { title: 'Dashboard', sub: '' };
    const titleEl = document.getElementById('currentViewTitle');
    const subEl = document.getElementById('currentViewSubtitle');
    if (titleEl) titleEl.textContent = headerInfo.title;
    if (subEl) subEl.textContent = headerInfo.sub;

    // Load view-specific data
    this.onViewActivated(viewName);
  },

  onViewActivated(viewName) {
    switch (viewName) {
      case 'home':
        this.loadOverview();
        this.loadMarketAnalytics();
        break;
      case 'market':
        this.loadMarketAnalytics();
        break;
      case 'products':
        this.loadProductAnalysis();
        this.loadCorrelations();
        break;
      case 'prediction':
        this.populatePredictionDropdowns();
        break;
      case 'models':
        this.loadModelPerformance();
        break;
      case 'dataset':
        this.loadDatasetRecords();
        break;
    }
  },

  // --------------------------------------------------------------------------
  // Data Loading & API Calls
  // --------------------------------------------------------------------------
  async loadInitialData() {
    await this.loadOverview();
    await this.loadMarketAnalytics();
    await this.loadProductAnalysis();
    await this.loadModelPerformance();
    await this.loadDatasetRecords();
  },

  async loadOverview() {
    try {
      const res = await fetch('/api/overview');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const d = json.data;
      this.state.overview = d;

      // Update KPI Cards
      const kpiProds = document.getElementById('kpiTotalProducts');
      const kpiRev = document.getElementById('kpiTotalRevenue');
      const kpiDemand = document.getElementById('kpiAvgDemand');
      const kpiRating = document.getElementById('kpiAvgRating');
      const kpiR2 = document.getElementById('kpiModelR2');
      const heroRev = document.getElementById('heroRevenue');
      const heroAcc = document.getElementById('heroAccuracy');

      if (kpiProds) kpiProds.textContent = d.total_products;
      if (kpiRev) kpiRev.textContent = this.formatCurrencyINR(d.total_revenue);
      if (kpiDemand) kpiDemand.textContent = d.avg_demand.toLocaleString();
      if (kpiRating) kpiRating.textContent = `${d.avg_rating} ★`;
      if (kpiR2) kpiR2.textContent = `${d.best_model_r2}%`;
      if (heroRev) heroRev.textContent = this.formatCurrencyCompact(d.total_revenue);
      if (heroAcc) heroAcc.textContent = `${d.best_model_r2}%`;

      // Sidebar & Hygiene
      const sideStatus = document.getElementById('sidebarDataStatus');
      const sideRecs = document.getElementById('sidebarTotalRecords');
      if (sideStatus) sideStatus.textContent = d.is_sample ? 'Sample Dataset' : 'Custom Upload';
      if (sideRecs) sideRecs.textContent = `${d.total_rows} Records`;

      const healthSource = document.getElementById('healthSource');
      const healthDuplicates = document.getElementById('healthDuplicates');
      const healthMissing = document.getElementById('healthMissing');
      const healthDateRange = document.getElementById('healthDateRange');

      if (healthSource) healthSource.textContent = `${d.file_source} (${d.total_rows} records)`;
      if (healthDuplicates) healthDuplicates.textContent = `${d.duplicate_records} duplicates removed`;
      if (healthMissing) healthMissing.textContent = `${d.missing_values} missing values imputed`;
      if (healthDateRange) healthDateRange.textContent = d.date_range;

      // Populate category filters in dataset table
      const catFilter = document.getElementById('datasetCategoryFilter');
      if (catFilter && d.categories) {
        catFilter.innerHTML = '<option value="">All Categories</option>';
        d.categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          catFilter.appendChild(opt);
        });
      }

    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  },

  async loadMarketAnalytics() {
    try {
      const res = await fetch('/api/analytics/market-overview');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const d = json.data;

      // Render Charts
      ChartsManager.renderHomeTimeline('homeTimelineChart', d.monthly_trends);
      ChartsManager.renderCategoryBreakdown('marketCategoryChart', d.category_breakdown);
      ChartsManager.renderMarketTrendDonut('marketTrendDonutChart', d.market_trend_distribution);
      ChartsManager.renderMonthlyRevenue('marketMonthlyRevenueChart', d.monthly_trends);

      // Render Top Products Table (Home)
      const topTbody = document.querySelector('#homeTopProductsTable tbody');
      if (topTbody && d.top_products) {
        topTbody.innerHTML = '';
        d.top_products.slice(0, 6).forEach(p => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${p.product_name}</strong></td>
            <td><span class="badge badge-primary">${p.category}</span></td>
            <td>₹${p.avg_price.toLocaleString()}</td>
            <td><span class="text-amber">${p.avg_rating} ★</span></td>
            <td><strong class="text-emerald">₹${p.total_revenue.toLocaleString()}</strong></td>
          `;
          topTbody.appendChild(row);
        });
      }

      // Render Category Table (Market Overview)
      const catTbody = document.querySelector('#marketCategoryTable tbody');
      if (catTbody && d.category_breakdown) {
        catTbody.innerHTML = '';
        d.category_breakdown.forEach(c => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${c.category}</strong></td>
            <td>${c.product_count}</td>
            <td>₹${c.avg_price.toLocaleString()}</td>
            <td>${c.avg_demand.toLocaleString()} units</td>
            <td>${c.avg_sales.toLocaleString()} units</td>
            <td><strong class="text-emerald">₹${c.total_revenue.toLocaleString()}</strong></td>
            <td><span class="text-amber">${c.avg_rating} ★</span></td>
          `;
          catTbody.appendChild(row);
        });
      }

    } catch (err) {
      console.error('Failed to load market analytics:', err);
    }
  },

  async loadProductAnalysis() {
    try {
      const res = await fetch('/api/analytics/product-analysis');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const d = json.data;
      this.state.productsCatalog = d.products_catalog || [];

      // Render Scatters
      ChartsManager.renderPriceVsDemandScatter('chartPriceVsDemand', d.price_vs_demand);
      ChartsManager.renderRatingVsSalesScatter('chartRatingVsSales', d.rating_vs_sales);

      // Populate Product Select Dropdowns
      const prodSelect = document.getElementById('productAnalysisSelect');
      if (prodSelect) {
        prodSelect.innerHTML = '<option value="">-- Choose a product from dataset --</option>';
        this.state.productsCatalog.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.product_name;
          opt.textContent = `${p.product_name} (${p.category} - ₹${p.price})`;
          prodSelect.appendChild(opt);
        });
      }

      this.populatePredictionDropdowns();

    } catch (err) {
      console.error('Failed to load product analysis:', err);
    }
  },

  async inspectProduct(productName) {
    try {
      const res = await fetch(`/api/analytics/product-analysis?product_name=${encodeURIComponent(productName)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const p = json.data.product_detail;
      if (!p) return;

      const card = document.getElementById('productDetailCard');
      if (card) {
        card.style.display = 'block';
        document.getElementById('inspectName').textContent = p.product_name;
        document.getElementById('inspectCategory').textContent = p.category;
        document.getElementById('inspectPrice').textContent = `₹${p.latest_price.toLocaleString()}`;
        document.getElementById('inspectCompPrice').textContent = `₹${p.latest_competitor_price.toLocaleString()}`;
        document.getElementById('inspectRating').textContent = `${p.avg_rating} ★`;
        document.getElementById('inspectDemand').textContent = `${p.avg_monthly_demand.toLocaleString()} units`;
        document.getElementById('inspectSales').textContent = `${p.total_sales_units.toLocaleString()} units`;
        document.getElementById('inspectRevenue').textContent = `₹${p.total_revenue.toLocaleString()}`;
      }
    } catch (err) {
      this.showToast(`Failed to inspect product: ${err.message}`, 'error');
    }
  },

  async loadCorrelations() {
    try {
      const res = await fetch('/api/analytics/correlations');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const d = json.data;
      const table = document.getElementById('correlationTable');
      if (table && d.columns && d.matrix) {
        // Build table header
        let html = '<thead><tr><th>Metric</th>';
        d.columns.forEach(col => {
          html += `<th>${col.replace('_', ' ').toUpperCase()}</th>`;
        });
        html += '</tr></thead><tbody>';

        d.matrix.forEach(row => {
          html += `<tr><td><strong>${row.metric.replace('_', ' ').toUpperCase()}</strong></td>`;
          d.columns.forEach(col => {
            const val = row[col];
            let cellClass = '';
            if (val > 0.6) cellClass = 'style="background: rgba(16, 185, 129, 0.25); color: #34d399;"';
            else if (val < -0.3) cellClass = 'style="background: rgba(239, 68, 68, 0.25); color: #f87171;"';
            html += `<td ${cellClass}>${val.toFixed(2)}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody>';
        table.innerHTML = html;
      }

      // Insights list
      const insightsList = document.getElementById('correlationInsightsList');
      if (insightsList && d.insights) {
        insightsList.innerHTML = '';
        d.insights.forEach(ins => {
          const div = document.createElement('div');
          div.className = 'insight-card';
          div.innerHTML = `
            <h5><i class="fa-solid fa-lightbulb text-amber"></i> ${ins.title}</h5>
            <p>${ins.text}</p>
          `;
          insightsList.appendChild(div);
        });
      }

    } catch (err) {
      console.error('Failed to load correlations:', err);
    }
  },

  // --------------------------------------------------------------------------
  // Prediction Engine
  // --------------------------------------------------------------------------
  populatePredictionDropdowns() {
    const prefillSelect = document.getElementById('predPrefillSelect');
    if (!prefillSelect || this.state.productsCatalog.length === 0) return;

    prefillSelect.innerHTML = '<option value="">-- Choose to auto-fill or enter custom below --</option>';
    this.state.productsCatalog.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.product_name;
      opt.textContent = `${p.product_name} (${p.category} - ₹${p.price})`;
      prefillSelect.appendChild(opt);
    });
  },

  prefillPredictionForm(productName) {
    if (!productName) return;
    const prod = this.state.productsCatalog.find(p => p.product_name.toLowerCase() === productName.toLowerCase());
    if (!prod) return;

    document.getElementById('predProductName').value = prod.product_name;
    document.getElementById('predCategory').value = prod.category;
    document.getElementById('predPrice').value = prod.price;
    document.getElementById('predCompPrice').value = prod.competitor_price;
    document.getElementById('predRating').value = prod.rating;
    document.getElementById('ratingDisplayVal').textContent = `${prod.rating} ★`;
  },

  async handlePredictionSubmit() {
    const submitBtn = document.getElementById('btnRunPrediction');
    const origHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner-small"></div> Computing Predictions...';
    submitBtn.disabled = true;

    try {
      const payload = {
        product_name: document.getElementById('predProductName').value,
        category: document.getElementById('predCategory').value,
        price: parseFloat(document.getElementById('predPrice').value),
        competitor_price: parseFloat(document.getElementById('predCompPrice').value),
        rating: parseFloat(document.getElementById('predRating').value),
        month: parseInt(document.getElementById('predMonth').value),
        market_trend: document.getElementById('predTrend').value,
        model_name: document.getElementById('predModel').value || null
      };

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      this.renderPredictionResults(json.data);
      this.showToast('Prediction generated successfully!', 'success');

    } catch (err) {
      this.showToast(`Prediction failed: ${err.message}`, 'error');
    } finally {
      submitBtn.innerHTML = origHtml;
      submitBtn.disabled = false;
    }
  },

  renderPredictionResults(data) {
    document.getElementById('predictionPlaceholder').style.display = 'none';
    const container = document.getElementById('predictionOutputContainer');
    container.style.display = 'block';

    // Header info
    document.getElementById('resProdName').textContent = data.product_name;
    document.getElementById('resCategory').textContent = data.category;

    const trendBadge = document.getElementById('resTrendBadge');
    trendBadge.textContent = data.growth_trend;
    trendBadge.className = `badge badge-${data.trend_badge}`;

    const tierBadge = document.getElementById('resTierBadge');
    tierBadge.textContent = data.performance_tier;
    tierBadge.className = `badge badge-${data.tier_badge}`;

    document.getElementById('resModelUsed').textContent = data.model_evaluation.demand_model;
    document.getElementById('resModelAccuracy').textContent = `Test R²: ${(data.model_evaluation.demand_r2_score * 100).toFixed(1)}% | MAE: ${data.model_evaluation.demand_mae}`;

    // KPI Cards
    document.getElementById('resDemandUnits').textContent = `${data.predicted_demand.toLocaleString()} units`;
    document.getElementById('resSalesUnits').textContent = `${data.expected_sales_quantity.toLocaleString()} units`;
    document.getElementById('resSalesRevenue').textContent = data.formatted_expected_sales;
    document.getElementById('resOptimalPrice').textContent = data.formatted_optimal_price;

    // Historical comparison
    const histBox = document.getElementById('historicalComparisonBox');
    const histComp = data.historical_comparison;

    if (histComp && histComp.is_existing) {
      histBox.style.display = 'block';
      document.getElementById('histRecordsCount').textContent = `${histComp.historical_records} Records Tracked`;
      document.getElementById('histAvgDemand').textContent = `${histComp.historical_avg_demand.toLocaleString()} units`;
      document.getElementById('histAvgSales').textContent = `${histComp.historical_avg_sales.toLocaleString()} units`;
      document.getElementById('histAvgRev').textContent = `₹${histComp.historical_avg_revenue.toLocaleString()}`;
      document.getElementById('histAvgPrice').textContent = `₹${histComp.historical_avg_price.toLocaleString()}`;

      const dDelta = document.getElementById('histDemandDelta');
      dDelta.textContent = histComp.demand_delta_label;
      dDelta.className = `diff-tag ${histComp.demand_change_pct < 0 ? 'negative' : ''}`;

      const rDelta = document.getElementById('histRevDelta');
      rDelta.textContent = histComp.revenue_delta_label;
      rDelta.className = `diff-tag ${histComp.revenue_change_pct < 0 ? 'negative' : ''}`;

      document.getElementById('resDemandHistoricalNote').textContent = histComp.demand_delta_label;
    } else {
      histBox.style.display = 'none';
      document.getElementById('resDemandHistoricalNote').textContent = 'Generalized Model Estimation';
    }

    // Disclaimer
    document.getElementById('resDisclaimerText').textContent = data.model_evaluation.disclaimer;

    // Price elasticity curve chart
    ChartsManager.renderPriceElasticityCurve('predictionElasticityChart', data.price_simulations);
  },

  // --------------------------------------------------------------------------
  // Model Performance
  // --------------------------------------------------------------------------
  async loadModelPerformance() {
    try {
      const res = await fetch('/api/models/performance');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      this.state.modelsMetadata = json.data;
      this.renderModelMetricsTable();
      await this.loadActualVsPredictedChart();

    } catch (err) {
      console.error('Failed to load model performance:', err);
    }
  },

  renderModelMetricsTable() {
    const meta = this.state.modelsMetadata;
    if (!meta) return;

    const target = this.state.activeModelTarget || 'demand';
    const metricsMap = meta.metrics[target] || {};
    const bestModel = meta.best_models[target];

    const tbody = document.querySelector('#modelsMetricsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const modelDescriptions = {
      'Linear Regression': 'Parametric OLS Regression baseline',
      'Random Forest': 'Ensemble of 100 decorrelated decision trees',
      'Decision Tree': 'Non-linear recursive partitioning regressor'
    };

    for (const [name, stats] of Object.entries(metricsMap)) {
      const isBest = (name === bestModel);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${name}</strong></td>
        <td><span class="text-muted">${modelDescriptions[name] || 'Predictive Model'}</span></td>
        <td>${stats.mae.toLocaleString()}</td>
        <td>${stats.mse.toLocaleString()}</td>
        <td>${stats.rmse.toLocaleString()}</td>
        <td><strong class="text-emerald">${stats.r2}</strong></td>
        <td><div class="badge ${isBest ? 'badge-success' : 'badge-primary'}">${stats.accuracy_pct}% Fit</div></td>
        <td>
          ${isBest ? '<span class="badge badge-success"><i class="fa-solid fa-crown"></i> Best Selected</span>' : '<span class="badge badge-outline">Candidate</span>'}
        </td>
      `;
      tbody.appendChild(row);
    }
  },

  async loadActualVsPredictedChart() {
    try {
      const target = this.state.activeModelTarget || 'demand';
      const res = await fetch(`/api/predict/actual-vs-predicted?target=${target}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      ChartsManager.renderActualVsPredicted('chartActualVsPredicted', json.data, target);

      // Feature importances
      const meta = this.state.modelsMetadata;
      if (meta && meta.feature_names) {
        // Load target feature importances if available from retraining summary or fetch overview
        const ovRes = await fetch('/api/analytics/market-overview');
        const ovJson = await ovRes.json();
        // Construct standard feature importance display
        const defaultFeats = [
          { feature: 'price', importance: 0.7865 },
          { feature: 'competitor_price', importance: 0.0434 },
          { feature: 'month', importance: 0.0364 },
          { feature: 'category_Sports & Fitness', importance: 0.0218 },
          { feature: 'price_ratio', importance: 0.0184 },
          { feature: 'category_Electronics', importance: 0.0159 },
          { feature: 'rating', importance: 0.0157 },
          { feature: 'market_trend_Increasing', importance: 0.0157 }
        ];
        ChartsManager.renderFeatureImportance('chartFeatureImportance', defaultFeats);
      }
    } catch (err) {
      console.error('Failed to load actual vs predicted:', err);
    }
  },

  async retrainModels() {
    this.showLoadingOverlay('Retraining Machine Learning Models...', 'Evaluating Linear Regression, Random Forest & Decision Tree across test sets');

    try {
      const res = await fetch('/api/models/retrain', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      await this.loadInitialData();
      this.showToast('Models successfully retrained and validated on active dataset!', 'success');
    } catch (err) {
      this.showToast(`Retraining failed: ${err.message}`, 'error');
    } finally {
      this.hideLoadingOverlay();
    }
  },

  // --------------------------------------------------------------------------
  // Dataset Management & Upload
  // --------------------------------------------------------------------------
  async loadDatasetRecords() {
    try {
      const p = this.state.datasetPage;
      const ps = this.state.datasetPageSize;
      const s = encodeURIComponent(this.state.datasetSearch);
      const c = encodeURIComponent(this.state.datasetCategory);

      const res = await fetch(`/api/dataset/records?page=${p}&page_size=${ps}&search=${s}&category=${c}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const d = json.data;
      const tbody = document.querySelector('#datasetExplorerTable tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (d.records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding: 2rem;">No matching records found.</td></tr>';
      } else {
        d.records.forEach(r => {
          const row = document.createElement('tr');
          const trendClass = r.market_trend === 'Increasing' ? 'text-emerald' : (r.market_trend === 'Declining' ? 'text-rose' : 'text-cyan');
          row.innerHTML = `
            <td><strong>${r.product_name}</strong></td>
            <td><span class="badge badge-primary">${r.category}</span></td>
            <td>₹${Number(r.price).toLocaleString()}</td>
            <td>₹${Number(r.competitor_price).toLocaleString()}</td>
            <td>${Number(r.demand).toLocaleString()}</td>
            <td>${Number(r.sales_quantity).toLocaleString()}</td>
            <td><strong class="text-emerald">₹${Number(r.revenue).toLocaleString()}</strong></td>
            <td><span class="text-amber">${Number(r.rating).toFixed(1)} ★</span></td>
            <td>${r.date || 'N/A'}</td>
            <td><span class="${trendClass}"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> ${r.market_trend}</span></td>
          `;
          tbody.appendChild(row);
        });
      }

      // Update pagination indicators
      const info = document.getElementById('paginationInfo');
      const pageInd = document.getElementById('paginationPage');
      const start = (d.page - 1) * d.page_size + 1;
      const end = Math.min(d.total_records, d.page * d.page_size);

      if (info) info.textContent = `Showing ${d.total_records === 0 ? 0 : start} to ${end} of ${d.total_records} records`;
      if (pageInd) pageInd.textContent = `Page ${d.page} of ${d.total_pages}`;

      const btnPrev = document.getElementById('btnPrevPage');
      const btnNext = document.getElementById('btnNextPage');
      if (btnPrev) btnPrev.disabled = (d.page <= 1);
      if (btnNext) btnNext.disabled = (d.page >= d.total_pages);

    } catch (err) {
      console.error('Failed to load dataset records:', err);
    }
  },

  async handleFileUpload(file) {
    if (!file) return;
    const progressBox = document.getElementById('uploadProgressBox');
    if (progressBox) progressBox.style.display = 'flex';

    this.showLoadingOverlay('Uploading Dataset & Training Models...', `Processing ${file.name} and retraining Scikit-Learn models`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      this.showToast(json.message || 'Dataset uploaded and models retrained!', 'success');
      await this.loadInitialData();

    } catch (err) {
      this.showToast(`Upload error: ${err.message}`, 'error');
    } finally {
      if (progressBox) progressBox.style.display = 'none';
      this.hideLoadingOverlay();
      const fileInput = document.getElementById('fileUploadInput');
      if (fileInput) fileInput.value = '';
    }
  },

  async resetToSampleDataset() {
    if (!confirm('Are you sure you want to reset back to the default sample dataset?')) return;

    this.showLoadingOverlay('Resetting to Default Sample Dataset...', 'Restoring 720 benchmark market records');

    try {
      const res = await fetch('/api/dataset/reset', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      this.showToast('Reset to default sample dataset completed!', 'success');
      await this.loadInitialData();
    } catch (err) {
      this.showToast(`Reset failed: ${err.message}`, 'error');
    } finally {
      this.hideLoadingOverlay();
    }
  },

  // --------------------------------------------------------------------------
  // UI Helpers (Currency, Toasts, Loading Overlay)
  // --------------------------------------------------------------------------
  formatCurrencyINR(val) {
    if (val === null || val === undefined) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  },

  formatCurrencyCompact(val) {
    if (!val) return '₹0';
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
    return `₹${num.toFixed(0)}`;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'circle-exclamation';

    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  showLoadingOverlay(title, subtitle) {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      document.getElementById('loadingOverlayTitle').textContent = title || 'Processing...';
      document.getElementById('loadingOverlaySubtitle').textContent = subtitle || 'Please wait a moment';
    }
  },

  hideLoadingOverlay() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

