const Portfolio = {
  transactions: [],

  init() {
    this.loadTransactions();
    this.setupEventListeners();
    this.renderPortfolio();
  },

  loadTransactions() {
    try {
      const raw = localStorage.getItem("cryptopulse_portfolio");
      if (raw) {
        this.transactions = JSON.parse(raw);
      } else {
        this.transactions = [
          {
            id: "tx-1",
            symbol: "BTC",
            amount: 0.25,
            buyPrice: 62000,
            buyDate: "2024-04-15"
          },
          {
            id: "tx-2",
            symbol: "ETH",
            amount: 2.5,
            buyPrice: 2400,
            buyDate: "2024-06-10"
          },
          {
            id: "tx-3",
            symbol: "SOL",
            amount: 15,
            buyPrice: 135,
            buyDate: "2024-08-20"
          }
        ];
        this.saveTransactions();
      }
    } catch (e) {
      this.transactions = [];
    }
  },

  saveTransactions() {
    try {
      localStorage.setItem("cryptopulse_portfolio", JSON.stringify(this.transactions));
    } catch (e) {}
  },

  setupEventListeners() {
    const form = document.getElementById("portfolio-form");
    if (!form) return;

    const symbolSelect = document.getElementById("tx-symbol");
    const priceInput = document.getElementById("tx-price");
    const dateInput = document.getElementById("tx-date");

    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split("T")[0];
    }

    if (symbolSelect && priceInput) {
      symbolSelect.addEventListener("change", () => {
        const sym = symbolSelect.value;
        const currentPrice = this.getCurrentPrice(sym);
        if (currentPrice > 0) {
          priceInput.value = currentPrice;
        }
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const symbol = document.getElementById("tx-symbol").value;
      const amount = parseFloat(document.getElementById("tx-amount").value);
      const buyPrice = parseFloat(document.getElementById("tx-price").value);
      const buyDate = document.getElementById("tx-date").value;

      if (!symbol || isNaN(amount) || amount <= 0 || isNaN(buyPrice) || buyPrice <= 0 || !buyDate) {
        if (window.App) window.App.showToast("Please fill all portfolio fields with valid numbers");
        return;
      }

      this.addTransaction({
        id: `tx-${Date.now()}`,
        symbol,
        amount,
        buyPrice,
        buyDate
      });

      form.reset();
      if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
      const defaultSym = document.getElementById("tx-symbol").value;
      if (priceInput) priceInput.value = this.getCurrentPrice(defaultSym) || "";

      if (window.App) window.App.showToast(`Recorded buy order for ${amount} ${symbol}`);
    });
  },

  addTransaction(tx) {
    this.transactions.push(tx);
    this.saveTransactions();
    this.renderPortfolio();
  },

  removeTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveTransactions();
    this.renderPortfolio();
    if (window.App) window.App.showToast("Removed transaction");
  },

  getCurrentPrice(symbol) {
    if (!API.cache.cryptos) return 0;
    const match = API.cache.cryptos.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
    return match ? match.priceUsd : 0;
  },

  getCoinMeta(symbol) {
    if (!API.cache.cryptos) return null;
    return API.cache.cryptos.find(c => c.symbol.toUpperCase() === symbol.toUpperCase()) || null;
  },

  generateRecommendation(tx, currentPrice, coinMeta) {
    const costBasis = tx.amount * tx.buyPrice;
    const currentValue = tx.amount * currentPrice;
    const pnlPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;

    const change7d = coinMeta ? coinMeta.change7d : 0;
    const change24h = coinMeta ? coinMeta.change24h : 0;
    const percentFromAth = coinMeta ? coinMeta.percentFromAth : -30;

    let action = "HOLD";
    let badgeClass = "badge-hold";
    let rationale = "";

    if (pnlPercent >= 75) {
      action = "TAKE PROFIT";
      badgeClass = "badge-sell";
      rationale = `Your position is up ${pnlPercent.toFixed(1)}%. Consider taking 25-50% off the table to lock in your gains.`;
    } else if (pnlPercent >= 35 && change7d < -3) {
      action = "PARTIAL SELL";
      badgeClass = "badge-sell";
      rationale = `Position has +${pnlPercent.toFixed(1)}% profit but 7-day momentum is cooling (${change7d.toFixed(1)}%). Good moment for partial profit taking.`;
    } else if (pnlPercent <= -30 && percentFromAth <= -70) {
      action = "STRONG BUY / DCA";
      badgeClass = "badge-buy";
      rationale = `Asset is down ${Math.abs(pnlPercent).toFixed(1)}% from your buy price and ${Math.abs(percentFromAth).toFixed(1)}% from all-time high. Great dollar-cost averaging discount.`;
    } else if (pnlPercent < 0 && change7d > 5) {
      action = "BUY MORE";
      badgeClass = "badge-buy";
      rationale = `Current position is at a small loss (${pnlPercent.toFixed(1)}%), but recent 7-day trend shows strong reversal (+${change7d.toFixed(1)}%).`;
    } else if (pnlPercent >= 0 && pnlPercent < 35) {
      action = "HOLD & ACCUMULATE";
      badgeClass = "badge-hold";
      rationale = `Healthy moderate gain (+${pnlPercent.toFixed(1)}%). Price trend is stable. Let the position grow toward targets.`;
    } else {
      action = "HOLD";
      badgeClass = "badge-hold";
      rationale = `Unrealized PnL is ${pnlPercent.toFixed(1)}%. No urgent action needed. Monitor market support levels.`;
    }

    return {
      action,
      badgeClass,
      rationale,
      pnlPercent,
      costBasis,
      currentValue
    };
  },

  renderPortfolio() {
    const listBody = document.getElementById("portfolio-list");
    const summaryInvested = document.getElementById("summary-invested");
    const summaryValue = document.getElementById("summary-value");
    const summaryPnl = document.getElementById("summary-pnl");
    const summaryPnlPercent = document.getElementById("summary-pnl-percent");
    const summaryFiat = document.getElementById("summary-fiat");

    if (!listBody) return;

    let totalInvested = 0;
    let totalCurrent = 0;

    let tableHtml = "";

    this.transactions.forEach(tx => {
      const currentPrice = this.getCurrentPrice(tx.symbol) || tx.buyPrice;
      const coinMeta = this.getCoinMeta(tx.symbol);
      const rec = this.generateRecommendation(tx, currentPrice, coinMeta);

      totalInvested += rec.costBasis;
      totalCurrent += rec.currentValue;

      const pnlDollar = rec.currentValue - rec.costBasis;
      const isProfitable = pnlDollar >= 0;

      tableHtml += `
        <tr class="portfolio-row">
          <td>
            <div class="coin-cell">
              <span class="coin-sym-badge">${tx.symbol}</span>
              <span class="tx-date-sub">${tx.buyDate}</span>
            </div>
          </td>
          <td>${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
          <td>$${tx.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>$${rec.costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="font-bold">$${rec.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="${isProfitable ? "text-green" : "text-red"} font-bold">
            ${isProfitable ? "+" : ""}$${pnlDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <div class="sub-percent">(${isProfitable ? "+" : ""}${rec.pnlPercent.toFixed(2)}%)</div>
          </td>
          <td>
            <div class="rec-container">
              <span class="rec-badge ${rec.badgeClass}">${rec.action}</span>
              <div class="rec-tooltip">${rec.rationale}</div>
            </div>
          </td>
          <td>
            <button class="btn-delete-tx" data-tx-id="${tx.id}" title="Remove Transaction">&times;</button>
          </td>
        </tr>
      `;
    });

    if (this.transactions.length === 0) {
      tableHtml = `<tr><td colspan="9" class="empty-table-msg">No transactions recorded yet. Add your first crypto purchase above.</td></tr>`;
    }

    listBody.innerHTML = tableHtml;

    const totalPnl = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const isTotalProfitable = totalPnl >= 0;

    if (summaryInvested) summaryInvested.textContent = `$${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (summaryValue) summaryValue.textContent = `$${totalCurrent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (summaryPnl) {
      summaryPnl.textContent = `${isTotalProfitable ? "+" : ""}$${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      summaryPnl.className = isTotalProfitable ? "text-green" : "text-red";
    }
    if (summaryPnlPercent) {
      summaryPnlPercent.textContent = `(${isTotalProfitable ? "+" : ""}${totalPnlPct.toFixed(2)}%)`;
      summaryPnlPercent.className = isTotalProfitable ? "text-green" : "text-red";
    }

    if (summaryFiat && API.cache.fiats) {
      const eurRate = API.cache.fiats.rates.EUR || 0.92;
      const gbpRate = API.cache.fiats.rates.GBP || 0.79;
      const totalEur = totalCurrent * eurRate;
      const totalGbp = totalCurrent * gbpRate;
      summaryFiat.textContent = `≈ €${totalEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR | £${totalGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP`;
    }

    listBody.querySelectorAll(".btn-delete-tx").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-tx-id");
        this.removeTransaction(id);
      });
    });
  }
};
