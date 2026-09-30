const ChartManager = {
  charts: {},
  chartCounter: 0,
  defaultColors: [
    "#2563eb",
    "#059669",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#db2777",
    "#0891b2"
  ],

  init() {
    this.createChart("BTC", "30D");
  },

  createChart(initialSymbol = "BTC", initialTimeframe = "30D") {
    this.chartCounter++;
    const chartId = `chart-instance-${this.chartCounter}`;
    const container = document.getElementById("charts-container");

    const chartCard = document.createElement("div");
    chartCard.className = "chart-card";
    chartCard.id = `card-${chartId}`;
    chartCard.innerHTML = `
      <div class="chart-header">
        <div class="chart-title-area">
          <div class="chart-active-tags" id="tags-${chartId}"></div>
        </div>
        <div class="chart-actions">
          <div class="timeframe-group" data-chart-id="${chartId}">
            <button class="btn-tf" data-tf="24H">24H</button>
            <button class="btn-tf" data-tf="7D">7D</button>
            <button class="btn-tf active" data-tf="30D">30D</button>
            <button class="btn-tf" data-tf="90D">90D</button>
            <button class="btn-tf" data-tf="1Y">1Y</button>
            <button class="btn-tf" data-tf="5Y">5Y</button>
          </div>
          <div class="chart-options-dropdown">
            <button class="btn-icon" id="type-btn-${chartId}">Type</button>
            <div class="dropdown-menu" id="type-menu-${chartId}">
              <button class="dropdown-item active" data-type="line">Line Chart</button>
              <button class="dropdown-item" data-type="bar">Bar Chart</button>
              <button class="dropdown-item" data-type="normalized">Normalized % (Base 100)</button>
            </div>
          </div>
          <button class="btn-icon btn-download-png" data-chart-id="${chartId}">PNG</button>
          <button class="btn-icon btn-download-svg" data-chart-id="${chartId}">SVG</button>
          <button class="btn-icon btn-share-chart" data-chart-id="${chartId}">Share</button>
          <button class="btn-icon btn-remove-chart" data-chart-id="${chartId}">Close</button>
        </div>
      </div>
      <div class="chart-drop-zone" id="drop-${chartId}">
        <div class="canvas-container">
          <canvas id="${chartId}"></canvas>
        </div>
      </div>
      <div class="chart-footer-stats" id="stats-${chartId}"></div>
    `;

    container.appendChild(chartCard);

    const ctx = document.getElementById(chartId).getContext("2d");
    const chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "#111827",
            titleColor: "#ffffff",
            bodyColor: "#f3f4f6",
            padding: 8,
            cornerRadius: 0,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || "";
                const val = context.parsed.y;
                const mode = this.charts[chartId].type;
                if (mode === "normalized") {
                  return `${label}: ${val.toFixed(2)} pts (${val >= 100 ? "+" : ""}${(val - 100).toFixed(2)}%)`;
                }
                if (label.includes("Ratio")) {
                  return `${label}: ${val.toFixed(5)}`;
                }
                if (label.includes("Rate") || ["EUR", "GBP", "JPY", "CAD", "CHF", "AUD"].includes(label)) {
                  return `${label}: ${val.toFixed(4)}`;
                }
                return `${label}: $${val.toLocaleString(undefined, { minimumFractionDigits: val < 1 ? 4 : 2, maximumFractionDigits: val < 1 ? 4 : 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "#f3f4f6" },
            ticks: { color: "#6b7280", maxTicksLimit: 8, font: { size: 11 } }
          },
          y: {
            grid: { color: "#f3f4f6" },
            ticks: {
              color: "#6b7280",
              font: { size: 11 },
              callback: function(val) {
                if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
                if (val < 1 && val > 0) return `$${val.toFixed(3)}`;
                return `$${val}`;
              }
            }
          }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
            const datasetIndex = el.datasetIndex;
            const index = el.index;
            const dataset = chartInstance.data.datasets[datasetIndex];
            const label = chartInstance.data.labels[index];
            const value = dataset.data[index];
            if (window.App && window.App.showDataInspector) {
              window.App.showDataInspector(dataset.symbol || dataset.label, {
                timestampLabel: label,
                value,
                timeframe: this.charts[chartId].timeframe
              });
            }
          }
        }
      }
    });

    this.charts[chartId] = {
      instance: chartInstance,
      symbols: [initialSymbol],
      colors: {},
      timeframe: initialTimeframe,
      type: "line",
      rawData: {}
    };

    this.charts[chartId].colors[initialSymbol] = this.defaultColors[0];

    this.setupChartEvents(chartId);
    this.loadChartData(chartId);
    this.updateRemoveButtons();
  },

  setupChartEvents(chartId) {
    const card = document.getElementById(`card-${chartId}`);
    const dropZone = document.getElementById(`drop-${chartId}`);

    card.querySelectorAll(".btn-tf").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".btn-tf").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tf = btn.getAttribute("data-tf");
        this.charts[chartId].timeframe = tf;
        this.loadChartData(chartId);
      });
    });

    const typeBtn = document.getElementById(`type-btn-${chartId}`);
    const typeMenu = document.getElementById(`type-menu-${chartId}`);
    typeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      typeMenu.classList.toggle("show");
    });

    typeMenu.querySelectorAll(".dropdown-item").forEach(item => {
      item.addEventListener("click", () => {
        typeMenu.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        typeMenu.classList.remove("show");
        const type = item.getAttribute("data-type");
        this.setChartType(chartId, type);
      });
    });

    document.addEventListener("click", () => {
      typeMenu.classList.remove("show");
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const symbol = e.dataTransfer.getData("text/plain");
      if (symbol) {
        this.addSymbolToChart(chartId, symbol);
      }
    });

    card.querySelector(".btn-download-png").addEventListener("click", () => {
      this.downloadPNG(chartId);
    });

    card.querySelector(".btn-download-svg").addEventListener("click", () => {
      this.downloadSVG(chartId);
    });

    card.querySelector(".btn-share-chart").addEventListener("click", () => {
      this.shareChart(chartId);
    });

    card.querySelector(".btn-remove-chart").addEventListener("click", () => {
      this.removeChart(chartId);
    });
  },

  async loadChartData(chartId) {
    const chartState = this.charts[chartId];
    if (!chartState) return;

    const symbols = chartState.symbols;
    const timeframe = chartState.timeframe;

    const dataPromises = symbols.map(sym => API.fetchAssetHistory(sym, timeframe));
    const results = await Promise.all(dataPromises);

    results.forEach((res, i) => {
      chartState.rawData[symbols[i]] = res;
    });

    this.renderChartDatasets(chartId);
    this.renderActiveTags(chartId);
    this.renderFooterStats(chartId);
  },

  renderChartDatasets(chartId) {
    const chartState = this.charts[chartId];
    if (!chartState) return;

    const chartInstance = chartState.instance;
    const symbols = chartState.symbols;
    const isNormalized = chartState.type === "normalized";

    let commonLabels = [];
    symbols.forEach(sym => {
      if (chartState.rawData[sym] && chartState.rawData[sym].labels.length > commonLabels.length) {
        commonLabels = chartState.rawData[sym].labels;
      }
    });

    const datasets = [];

    symbols.forEach((sym, idx) => {
      const history = chartState.rawData[sym];
      if (!history) return;

      const color = chartState.colors[sym] || this.defaultColors[idx % this.defaultColors.length];
      chartState.colors[sym] = color;

      let plotValues = history.values;
      if (isNormalized && plotValues.length > 0) {
        const base = plotValues[0] || 1;
        plotValues = plotValues.map(v => parseFloat(((v / base) * 100).toFixed(2)));
      }

      const isBar = chartState.type === "bar";

      datasets.push({
        label: isNormalized ? `${sym} (% Growth)` : sym,
        symbol: sym,
        data: plotValues,
        borderColor: color,
        backgroundColor: isBar ? color : "transparent",
        borderWidth: 1.8,
        fill: false,
        tension: 0.1,
        pointRadius: plotValues.length > 40 ? 0 : 2,
        pointHoverRadius: 4,
        type: isBar ? "bar" : "line"
      });
    });

    chartInstance.data.labels = commonLabels;
    chartInstance.data.datasets = datasets;

    if (isNormalized) {
      chartInstance.options.scales.y.ticks.callback = function(val) {
        return `${val} pts`;
      };
    } else {
      chartInstance.options.scales.y.ticks.callback = function(val) {
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
        if (val < 1 && val > 0) return `$${val.toFixed(3)}`;
        return `$${val}`;
      };
    }

    chartInstance.update();
  },

  renderActiveTags(chartId) {
    const chartState = this.charts[chartId];
    const tagsContainer = document.getElementById(`tags-${chartId}`);
    if (!tagsContainer) return;

    tagsContainer.innerHTML = "";

    chartState.symbols.forEach((sym) => {
      const color = chartState.colors[sym];
      const tag = document.createElement("div");
      tag.className = "asset-tag";
      tag.innerHTML = `
        <input type="color" class="color-picker-input" value="${color}" data-chart-id="${chartId}" data-symbol="${sym}">
        <span>${sym}</span>
        ${chartState.symbols.length > 1 ? `<button class="tag-remove" data-chart-id="${chartId}" data-symbol="${sym}">&times;</button>` : ""}
      `;
      tagsContainer.appendChild(tag);
    });

    tagsContainer.querySelectorAll(".color-picker-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const sym = e.target.getAttribute("data-symbol");
        const newColor = e.target.value;
        chartState.colors[sym] = newColor;
        this.renderChartDatasets(chartId);
      });
    });

    tagsContainer.querySelectorAll(".tag-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const sym = e.target.getAttribute("data-symbol");
        this.removeSymbolFromChart(chartId, sym);
      });
    });
  },

  renderFooterStats(chartId) {
    const chartState = this.charts[chartId];
    const footer = document.getElementById(`stats-${chartId}`);
    if (!footer) return;

    let html = "";
    chartState.symbols.forEach(sym => {
      const data = chartState.rawData[sym];
      if (!data || data.values.length === 0) return;

      const first = data.values[0];
      const last = data.values[data.values.length - 1];
      const change = ((last - first) / first) * 100;
      const isPos = change >= 0;
      const min = Math.min(...data.values);
      const max = Math.max(...data.values);

      html += `
        <div class="stat-pill">
          <span class="stat-sym" style="color: ${chartState.colors[sym]}">${sym}</span>
          <span class="stat-val">$${last.toLocaleString()}</span>
          <span class="stat-change ${isPos ? "positive" : "negative"}">${isPos ? "+" : ""}${change.toFixed(2)}%</span>
          <span class="stat-range">Range: $${min.toLocaleString()} - $${max.toLocaleString()}</span>
        </div>
      `;
    });

    footer.innerHTML = html;
  },

  addSymbolToChart(chartId, symbol) {
    const chartState = this.charts[chartId];
    if (!chartState) return;

    if (!chartState.symbols.includes(symbol)) {
      if (chartState.symbols.length >= 5) {
        if (window.App) window.App.showToast("Maximum 5 comparison series per chart");
        return;
      }
      chartState.symbols.push(symbol);
      const nextColor = this.defaultColors[chartState.symbols.length % this.defaultColors.length];
      chartState.colors[symbol] = nextColor;
      this.loadChartData(chartId);
      if (window.App) window.App.showToast(`Added ${symbol} to chart`);
    } else {
      if (window.App) window.App.showToast(`${symbol} is already in this chart`);
    }
  },

  removeSymbolFromChart(chartId, symbol) {
    const chartState = this.charts[chartId];
    if (!chartState || chartState.symbols.length <= 1) return;

    chartState.symbols = chartState.symbols.filter(s => s !== symbol);
    delete chartState.rawData[symbol];
    this.loadChartData(chartId);
  },

  setChartType(chartId, type) {
    const chartState = this.charts[chartId];
    if (!chartState) return;
    chartState.type = type;
    this.renderChartDatasets(chartId);
  },

  removeChart(chartId) {
    if (Object.keys(this.charts).length <= 1) {
      if (window.App) window.App.showToast("At least one chart must remain open");
      return;
    }

    if (this.charts[chartId]) {
      this.charts[chartId].instance.destroy();
      delete this.charts[chartId];
    }

    const card = document.getElementById(`card-${chartId}`);
    if (card) card.remove();
    this.updateRemoveButtons();
  },

  updateRemoveButtons() {
    const count = Object.keys(this.charts).length;
    document.querySelectorAll(".btn-remove-chart").forEach(btn => {
      btn.style.display = count > 1 ? "inline-flex" : "none";
    });
  },

  downloadPNG(chartId) {
    const chartInstance = this.charts[chartId]?.instance;
    if (!chartInstance) return;

    const base64 = chartInstance.toBase64Image("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `chart-${chartId}-${Date.now()}.png`;
    link.href = base64;
    link.click();
    if (window.App) window.App.showToast("Chart downloaded as PNG");
  },

  downloadSVG(chartId) {
    const chartState = this.charts[chartId];
    if (!chartState) return;

    const labels = chartState.instance.data.labels;
    const datasets = chartState.instance.data.datasets;
    if (!datasets || datasets.length === 0) return;

    const width = 800;
    const height = 400;
    const padding = 50;

    let allVals = [];
    datasets.forEach(d => { allVals = allVals.concat(d.data); });
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const valRange = (maxVal - minVal) || 1;

    let pathsHtml = "";
    datasets.forEach(ds => {
      const pts = ds.data.map((val, idx) => {
        const x = padding + (idx / (labels.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((val - minVal) / valRange) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      pathsHtml += `<polyline fill="none" stroke="${ds.borderColor}" stroke-width="2" points="${pts.join(" ")}" />`;
    });

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#ffffff;font-family:sans-serif;">
        <rect width="${width}" height="${height}" fill="#ffffff" />
        <text x="${padding}" y="30" fill="#111827" font-size="14" font-weight="bold">${chartState.symbols.join(" vs ")} (${chartState.timeframe})</text>
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e5e7eb" stroke-width="1"/>
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#e5e7eb" stroke-width="1"/>
        ${pathsHtml}
        <text x="${padding}" y="${height - 15}" fill="#6b7280" font-size="11">${labels[0] || ""}</text>
        <text x="${width - padding - 60}" y="${height - 15}" fill="#6b7280" font-size="11">${labels[labels.length - 1] || ""}</text>
      </svg>
    `;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `chart-${chartId}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    if (window.App) window.App.showToast("Chart downloaded as SVG");
  },

  shareChart(chartId) {
    const chartState = this.charts[chartId];
    if (!chartState) return;

    const base64 = chartState.instance.toBase64Image("image/png", 1.0);
    const symbols = chartState.symbols.join(", ");
    const text = `Check out the ${symbols} price comparison chart.`;

    if (window.App && window.App.openShareModal) {
      window.App.openShareModal({
        image: base64,
        title: `Price Chart - ${symbols}`,
        text: text,
        symbols: chartState.symbols
      });
    }
  }
};
