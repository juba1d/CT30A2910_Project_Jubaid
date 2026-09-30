const App = {
  currentTab: "charts",

  async init() {
    this.setupNavigation();
    this.setupModals();
    this.setupConverter();
    this.setupAddChartButton();

    this.renderTicker();
    this.renderAssetList();
    this.renderAnalyticsSection();

    ChartManager.init();
    Portfolio.init();
    this.populatePortfolioSelect();

    try {
      await API.fetchAllMarketData();
      this.renderTicker();
      this.renderAssetList();
      this.renderAnalyticsSection();
      this.populatePortfolioSelect();
      Portfolio.renderPortfolio();
    } catch (e) {}

    setInterval(async () => {
      await API.fetchAllMarketData();
      this.renderTicker();
      this.renderAssetList();
      Portfolio.renderPortfolio();
    }, 60000);
  },

  setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".app-section");

    navButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.getAttribute("data-target");

        navButtons.forEach(b => b.classList.remove("active"));
        sections.forEach(s => s.classList.remove("active"));

        btn.classList.add("active");
        const activeSection = document.getElementById(`section-${target}`);
        if (activeSection) {
          activeSection.classList.add("active");
        }
        this.currentTab = target;

        if (target === "portfolio") {
          Portfolio.renderPortfolio();
        } else if (target === "analytics") {
          this.renderAnalyticsSection();
        }
      });
    });
  },

  setupAddChartButton() {
    const btn = document.getElementById("btn-add-chart");
    if (btn) {
      btn.addEventListener("click", () => {
        const availableCryptos = ["ETH", "SOL", "DOGE", "XRP", "BNB", "ADA", "EUR", "ETH_BTC"];
        const currentCount = Object.keys(ChartManager.charts).length;
        const nextSymbol = availableCryptos[currentCount % availableCryptos.length];
        ChartManager.createChart(nextSymbol, "30D");
        this.showToast(`Added new chart for ${nextSymbol}`);
      });
    }
  },

  renderTicker() {
    const tickerContainer = document.getElementById("ticker-track");
    if (!tickerContainer) return;

    const cryptos = API.cache.cryptos || API.getFallbackCryptoData();
    const fiats = API.cache.fiats || API.getFallbackFiatData();

    let items = [];

    cryptos.slice(0, 8).forEach(c => {
      const isPos = c.change24h >= 0;
      items.push(`
        <div class="ticker-item" onclick="App.showDataInspector('${c.symbol}')">
          <span class="ticker-sym">${c.symbol}</span>
          <span class="ticker-price">$${c.priceUsd.toLocaleString(undefined, { minimumFractionDigits: c.priceUsd < 1 ? 4 : 2, maximumFractionDigits: c.priceUsd < 1 ? 4 : 2 })}</span>
          <span class="ticker-change ${isPos ? "positive" : "negative"}">${isPos ? "+" : ""}${c.change24h.toFixed(2)}%</span>
        </div>
      `);
    });

    const fiatList = [
      { sym: "EUR/USD", val: (1 / (fiats.rates.EUR || 0.92)).toFixed(4) },
      { sym: "GBP/USD", val: (1 / (fiats.rates.GBP || 0.79)).toFixed(4) },
      { sym: "USD/JPY", val: (fiats.rates.JPY || 155.2).toFixed(2) }
    ];

    fiatList.forEach(f => {
      items.push(`
        <div class="ticker-item">
          <span class="ticker-sym">${f.sym}</span>
          <span class="ticker-price">${f.val}</span>
        </div>
      `);
    });

    tickerContainer.innerHTML = items.join("") + items.join("");
  },

  renderAssetList() {
    const cryptoListEl = document.getElementById("crypto-assets-list");
    const fiatListEl = document.getElementById("fiat-assets-list");
    const derivedListEl = document.getElementById("derived-assets-list");

    if (!cryptoListEl) return;

    const cryptos = API.cache.cryptos || API.getFallbackCryptoData();
    const fiats = API.cache.fiats || API.getFallbackFiatData();

    let cryptoHtml = "";
    cryptos.slice(0, 10).forEach(c => {
      const isPos = c.change24h >= 0;
      cryptoHtml += `
        <div class="asset-chip draggable-chip" draggable="true" data-symbol="${c.symbol}" data-name="${c.name}">
          <div class="chip-drag-handle">::</div>
          <div class="chip-main">
            <div class="chip-row">
              <span class="chip-sym">${c.symbol}</span>
              <span class="chip-name">${c.name}</span>
            </div>
            <div class="chip-row">
              <span class="chip-price">$${c.priceUsd.toLocaleString(undefined, { minimumFractionDigits: c.priceUsd < 1 ? 4 : 2, maximumFractionDigits: c.priceUsd < 1 ? 4 : 2 })}</span>
              <span class="chip-change ${isPos ? "positive" : "negative"}">${isPos ? "+" : ""}${c.change24h.toFixed(2)}%</span>
            </div>
          </div>
          <div class="chip-actions">
            <button class="btn-chip-action btn-inspect-asset" title="Details" onclick="App.showDataInspector('${c.symbol}')">i</button>
            <button class="btn-chip-action btn-add-mobile" title="Add" onclick="App.addAssetToActiveChart('${c.symbol}')">+</button>
          </div>
        </div>
      `;
    });
    cryptoListEl.innerHTML = cryptoHtml;

    const fiatSymbols = ["EUR", "GBP", "JPY", "CAD", "CHF", "AUD"];
    const fiatNames = {
      EUR: "Euro",
      GBP: "British Pound",
      JPY: "Japanese Yen",
      CAD: "Canadian Dollar",
      CHF: "Swiss Franc",
      AUD: "Australian Dollar"
    };

    let fiatHtml = "";
    fiatSymbols.forEach(f => {
      const rate = fiats.rates[f] || 1;
      fiatHtml += `
        <div class="asset-chip draggable-chip" draggable="true" data-symbol="${f}" data-name="${fiatNames[f]}">
          <div class="chip-drag-handle">::</div>
          <div class="chip-main">
            <div class="chip-row">
              <span class="chip-sym">${f}</span>
              <span class="chip-name">${fiatNames[f]}</span>
            </div>
            <div class="chip-row">
              <span class="chip-price">1 USD = ${rate.toFixed(4)} ${f}</span>
            </div>
          </div>
          <div class="chip-actions">
            <button class="btn-chip-action btn-add-mobile" title="Add" onclick="App.addAssetToActiveChart('${f}')">+</button>
          </div>
        </div>
      `;
    });
    if (fiatListEl) fiatListEl.innerHTML = fiatHtml;

    const derivedItems = [
      { sym: "ETH_BTC", name: "ETH/BTC Ratio", desc: "ETH value in BTC" },
      { sym: "SMA_BTC_7", name: "BTC 7D Moving Avg", desc: "7-day trend line" },
      { sym: "SMA_ETH_7", name: "ETH 7D Moving Avg", desc: "7-day trend line" }
    ];

    let derivedHtml = "";
    derivedItems.forEach(d => {
      derivedHtml += `
        <div class="asset-chip draggable-chip chip-derived" draggable="true" data-symbol="${d.sym}" data-name="${d.name}">
          <div class="chip-drag-handle">::</div>
          <div class="chip-main">
            <div class="chip-row">
              <span class="chip-sym">${d.name}</span>
            </div>
            <div class="chip-row">
              <span class="chip-desc">${d.desc}</span>
            </div>
          </div>
          <div class="chip-actions">
            <button class="btn-chip-action btn-add-mobile" title="Add" onclick="App.addAssetToActiveChart('${d.sym}')">+</button>
          </div>
        </div>
      `;
    });
    if (derivedListEl) derivedListEl.innerHTML = derivedHtml;

    this.setupDraggables();
    this.setupSearch();
  },

  setupDraggables() {
    document.querySelectorAll(".draggable-chip").forEach(chip => {
      chip.addEventListener("dragstart", (e) => {
        const symbol = chip.getAttribute("data-symbol");
        e.dataTransfer.setData("text/plain", symbol);
        chip.classList.add("dragging");
      });

      chip.addEventListener("dragend", () => {
        chip.classList.remove("dragging");
      });
    });
  },

  setupSearch() {
    const searchInput = document.getElementById("asset-search");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".asset-chip").forEach(chip => {
        const sym = (chip.getAttribute("data-symbol") || "").toLowerCase();
        const name = (chip.getAttribute("data-name") || "").toLowerCase();
        if (sym.includes(q) || name.includes(q)) {
          chip.style.display = "flex";
        } else {
          chip.style.display = "none";
        }
      });
    });
  },

  addAssetToActiveChart(symbol) {
    const firstChartId = Object.keys(ChartManager.charts)[0];
    if (firstChartId) {
      ChartManager.addSymbolToChart(firstChartId, symbol);
    }
  },

  populatePortfolioSelect() {
    const select = document.getElementById("tx-symbol");
    const priceInput = document.getElementById("tx-price");
    if (!select) return;

    const cryptos = API.cache.cryptos || API.getFallbackCryptoData();
    select.innerHTML = cryptos.slice(0, 15).map(c => `
      <option value="${c.symbol}">${c.name} (${c.symbol})</option>
    `).join("");

    if (cryptos.length > 0 && priceInput && !priceInput.value) {
      priceInput.value = cryptos[0].priceUsd;
    }
  },

  setupConverter() {
    const fromInput = document.getElementById("conv-from-amount");
    const fromSelect = document.getElementById("conv-from-symbol");
    const toSelect = document.getElementById("conv-to-symbol");
    const toInput = document.getElementById("conv-to-amount");
    const swapBtn = document.getElementById("conv-swap");

    if (!fromInput || !fromSelect || !toSelect || !toInput) return;

    const calculate = () => {
      const amount = parseFloat(fromInput.value);
      if (isNaN(amount) || amount < 0) {
        toInput.value = "";
        return;
      }

      const from = fromSelect.value;
      const to = toSelect.value;

      const cryptos = API.cache.cryptos || API.getFallbackCryptoData();
      const fiats = API.cache.fiats || API.getFallbackFiatData();

      const getUsdValue = (sym) => {
        if (sym === "USD") return 1;
        const c = cryptos.find(x => x.symbol === sym);
        if (c) return c.priceUsd;
        const fRate = fiats.rates[sym];
        if (fRate) return 1 / fRate;
        return 1;
      };

      const fromValUsd = getUsdValue(from);
      const toValUsd = getUsdValue(to);

      const result = (amount * fromValUsd) / toValUsd;
      toInput.value = result.toLocaleString(undefined, {
        minimumFractionDigits: result < 1 ? 4 : 2,
        maximumFractionDigits: result < 1 ? 4 : 2
      });
    };

    fromInput.addEventListener("input", calculate);
    fromSelect.addEventListener("change", calculate);
    toSelect.addEventListener("change", calculate);

    if (swapBtn) {
      swapBtn.addEventListener("click", () => {
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
        calculate();
      });
    }

    calculate();
  },

  renderAnalyticsSection() {
    const tableBody = document.getElementById("purchasing-power-body");
    if (!tableBody) return;

    const cryptos = API.cache.cryptos || API.getFallbackCryptoData();
    const fiats = API.cache.fiats || API.getFallbackFiatData();

    const selectedCryptos = ["BTC", "ETH", "SOL", "DOGE", "XRP", "BNB"];
    let html = "";

    selectedCryptos.forEach(sym => {
      const c = cryptos.find(x => x.symbol === sym);
      if (!c) return;

      const pUsd = c.priceUsd;
      const pEur = pUsd * (fiats.rates.EUR || 0.92);
      const pGbp = pUsd * (fiats.rates.GBP || 0.79);
      const pJpy = pUsd * (fiats.rates.JPY || 155.2);
      const pCad = pUsd * (fiats.rates.CAD || 1.38);
      const pChf = pUsd * (fiats.rates.CHF || 0.88);

      html += `
        <tr>
          <td class="font-bold">${c.name} (${c.symbol})</td>
          <td>$${pUsd.toLocaleString(undefined, { minimumFractionDigits: pUsd < 1 ? 4 : 2, maximumFractionDigits: pUsd < 1 ? 4 : 2 })}</td>
          <td>€${pEur.toLocaleString(undefined, { minimumFractionDigits: pEur < 1 ? 4 : 2, maximumFractionDigits: pEur < 1 ? 4 : 2 })}</td>
          <td>£${pGbp.toLocaleString(undefined, { minimumFractionDigits: pGbp < 1 ? 4 : 2, maximumFractionDigits: pGbp < 1 ? 4 : 2 })}</td>
          <td>¥${pJpy.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
          <td>C$${pCad.toLocaleString(undefined, { minimumFractionDigits: pCad < 1 ? 4 : 2, maximumFractionDigits: pCad < 1 ? 4 : 2 })}</td>
          <td>CHF ${pChf.toLocaleString(undefined, { minimumFractionDigits: pChf < 1 ? 4 : 2, maximumFractionDigits: pChf < 1 ? 4 : 2 })}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  },

  showDataInspector(symbol, extraPointData = null) {
    const cryptos = API.cache.cryptos || API.getFallbackCryptoData();
    const fiats = API.cache.fiats || API.getFallbackFiatData();

    let meta = cryptos.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
    if (!meta) {
      meta = {
        name: symbol,
        symbol: symbol,
        rank: "-",
        priceUsd: extraPointData ? extraPointData.value : 0,
        change1h: 0,
        change24h: 0,
        change7d: 0,
        change30d: 0,
        change1y: 0,
        volume24h: 0,
        marketCap: 0,
        athPrice: 0,
        athDate: "",
        percentFromAth: 0
      };
    }

    const modal = document.getElementById("inspector-modal");
    const content = document.getElementById("inspector-content");
    if (!modal || !content) return;

    const eurVal = meta.priceUsd * (fiats.rates.EUR || 0.92);
    const gbpVal = meta.priceUsd * (fiats.rates.GBP || 0.79);
    const jpyVal = meta.priceUsd * (fiats.rates.JPY || 155.2);

    content.innerHTML = `
      <div class="inspector-header">
        <div>
          <h3>${meta.name} <span class="badge-sub">${meta.symbol}</span></h3>
          <div class="inspector-rank">Rank #${meta.rank}</div>
        </div>
        <div style="text-align: right;">
          <div class="big-price">$${meta.priceUsd.toLocaleString(undefined, { minimumFractionDigits: meta.priceUsd < 1 ? 4 : 2, maximumFractionDigits: meta.priceUsd < 1 ? 4 : 2 })}</div>
          <div class="sub-price-conversions">
            ≈ €${eurVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR | £${gbpVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP
          </div>
        </div>
      </div>

      ${extraPointData ? `
        <div class="inspector-point-highlight">
          <span class="hl-label">Selected Point:</span>
          <span class="hl-time">${extraPointData.timestampLabel}</span>
          <span class="hl-val">$${extraPointData.value.toLocaleString()}</span>
        </div>
      ` : ""}

      <div class="inspector-grid">
        <div class="inspector-card">
          <div class="ins-label">24h Change</div>
          <div class="ins-val ${meta.change24h >= 0 ? "positive" : "negative"}">${meta.change24h >= 0 ? "+" : ""}${meta.change24h.toFixed(2)}%</div>
        </div>
        <div class="inspector-card">
          <div class="ins-label">7d Change</div>
          <div class="ins-val ${meta.change7d >= 0 ? "positive" : "negative"}">${meta.change7d >= 0 ? "+" : ""}${meta.change7d.toFixed(2)}%</div>
        </div>
        <div class="inspector-card">
          <div class="ins-label">30d Change</div>
          <div class="ins-val ${meta.change30d >= 0 ? "positive" : "negative"}">${meta.change30d >= 0 ? "+" : ""}${meta.change30d.toFixed(2)}%</div>
        </div>
        <div class="inspector-card">
          <div class="ins-label">1 Year Change</div>
          <div class="ins-val ${meta.change1y >= 0 ? "positive" : "negative"}">${meta.change1y >= 0 ? "+" : ""}${meta.change1y.toFixed(2)}%</div>
        </div>
        <div class="inspector-card">
          <div class="ins-label">24h Volume</div>
          <div class="ins-val">$${meta.volume24h.toLocaleString()}</div>
        </div>
        <div class="inspector-card">
          <div class="ins-label">Market Cap</div>
          <div class="ins-val">$${meta.marketCap.toLocaleString()}</div>
        </div>
        <div class="inspector-card">
          <div class="ins-label">All-Time High</div>
          <div class="ins-val">$${meta.athPrice.toLocaleString()}</div>
          <div class="ins-sub">${meta.athDate ? new Date(meta.athDate).toLocaleDateString() : ""} (${meta.percentFromAth.toFixed(1)}%)</div>
        </div>
      </div>
      <div class="inspector-actions">
        <button class="btn-primary" onclick="App.addAssetToActiveChart('${meta.symbol}'); App.closeModal('inspector-modal');">Add to Chart</button>
      </div>
    `;

    modal.classList.add("show");
  },

  openShareModal(data) {
    const modal = document.getElementById("share-modal");
    const previewImg = document.getElementById("share-preview-img");
    const titleEl = document.getElementById("share-title");
    if (!modal) return;

    if (previewImg) previewImg.src = data.image;
    if (titleEl) titleEl.textContent = data.title;

    const shareUrl = window.location.href;
    const shareText = `${data.text} Currency comparison chart.`;

    document.getElementById("btn-share-twitter").onclick = () => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(url, "_blank");
    };

    document.getElementById("btn-share-telegram").onclick = () => {
      const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");
    };

    document.getElementById("btn-share-reddit").onclick = () => {
      const url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(data.title)}`;
      window.open(url, "_blank");
    };

    document.getElementById("btn-share-linkedin").onclick = () => {
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      window.open(url, "_blank");
    };

    document.getElementById("btn-share-native").onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: data.title,
            text: data.text,
            url: window.location.href
          });
        } catch (err) {}
      } else {
        await navigator.clipboard.writeText(`${data.text} ${window.location.href}`);
        this.showToast("Copied text to clipboard");
      }
    };

    document.getElementById("btn-copy-link").onclick = async () => {
      await navigator.clipboard.writeText(window.location.href);
      this.showToast("Link copied to clipboard");
    };

    modal.classList.add("show");
  },

  setupModals() {
    document.querySelectorAll(".modal-close, .modal-backdrop").forEach(el => {
      el.addEventListener("click", () => {
        document.querySelectorAll(".modal").forEach(m => m.classList.remove("show"));
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal").forEach(m => m.classList.remove("show"));
      }
    });
  },

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove("show");
  },

  showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
