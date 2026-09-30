const API = {
  sources: {
    coinpaprika: "https://api.coinpaprika.com/v1",
    frankfurter: "https://api.frankfurter.dev/v1",
    binance: "https://api.binance.com/api/v3",
    openExchange: "https://open.er-api.com/v6/latest/USD"
  },

  cache: {
    cryptos: null,
    fiats: null,
    binance24h: null,
    historyCache: {},
    lastFetched: 0
  },

  async fetchAllMarketData() {
    const results = await Promise.allSettled([
      this.fetchCoinpaprikaTickers(),
      this.fetchFiatRates(),
      this.fetchBinanceTickers()
    ]);

    const cryptoData = results[0].status === "fulfilled" ? results[0].value : this.getFallbackCryptoData();
    const fiatData = results[1].status === "fulfilled" ? results[1].value : this.getFallbackFiatData();
    const binanceData = results[2].status === "fulfilled" ? results[2].value : {};

    this.cache.cryptos = cryptoData;
    this.cache.fiats = fiatData;
    this.cache.binance24h = binanceData;
    this.cache.lastFetched = Date.now();

    return {
      cryptos: cryptoData,
      fiats: fiatData,
      binance: binanceData
    };
  },

  async fetchCoinpaprikaTickers() {
    try {
      const response = await fetch(`${this.sources.coinpaprika}/tickers`);
      if (!response.ok) throw new Error("Coinpaprika request failed");
      const data = await response.json();
      return data.slice(0, 50).map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        rank: coin.rank,
        priceUsd: coin.quotes?.USD?.price || 0,
        volume24h: coin.quotes?.USD?.volume_24h || 0,
        marketCap: coin.quotes?.USD?.market_cap || 0,
        change1h: coin.quotes?.USD?.percent_change_1h || 0,
        change24h: coin.quotes?.USD?.percent_change_24h || 0,
        change7d: coin.quotes?.USD?.percent_change_7d || 0,
        change30d: coin.quotes?.USD?.percent_change_30d || 0,
        change1y: coin.quotes?.USD?.percent_change_1y || 0,
        athPrice: coin.quotes?.USD?.ath_price || 0,
        athDate: coin.quotes?.USD?.ath_date || "",
        percentFromAth: coin.quotes?.USD?.percent_from_price_ath || 0
      }));
    } catch (err) {
      return this.getFallbackCryptoData();
    }
  },

  async fetchFiatRates() {
    try {
      const response = await fetch(`${this.sources.frankfurter}/latest?base=USD`);
      if (!response.ok) {
        return await this.fetchOpenExchangeRates();
      }
      const data = await response.json();
      return {
        base: "USD",
        date: data.date,
        rates: {
          USD: 1,
          EUR: data.rates.EUR || 0.92,
          GBP: data.rates.GBP || 0.79,
          JPY: data.rates.JPY || 155.2,
          CAD: data.rates.CAD || 1.38,
          CHF: data.rates.CHF || 0.88,
          AUD: data.rates.AUD || 1.52,
          CNY: data.rates.CNY || 7.24,
          INR: data.rates.INR || 84.5
        }
      };
    } catch (err) {
      return await this.fetchOpenExchangeRates();
    }
  },

  async fetchOpenExchangeRates() {
    try {
      const res = await fetch(this.sources.openExchange);
      if (!res.ok) throw new Error("OpenExchange failed");
      const data = await res.json();
      return {
        base: "USD",
        date: new Date().toISOString().split("T")[0],
        rates: {
          USD: 1,
          EUR: data.rates?.EUR || 0.92,
          GBP: data.rates?.GBP || 0.79,
          JPY: data.rates?.JPY || 155.2,
          CAD: data.rates?.CAD || 1.38,
          CHF: data.rates?.CHF || 0.88,
          AUD: data.rates?.AUD || 1.52,
          CNY: data.rates?.CNY || 7.24,
          INR: data.rates?.INR || 84.5
        }
      };
    } catch (e) {
      return this.getFallbackFiatData();
    }
  },

  async fetchBinanceTickers() {
    try {
      const res = await fetch(`${this.sources.binance}/ticker/24hr`);
      if (!res.ok) return {};
      const data = await res.json();
      const map = {};
      data.forEach(item => {
        map[item.symbol] = {
          lastPrice: parseFloat(item.lastPrice),
          priceChangePercent: parseFloat(item.priceChangePercent),
          highPrice: parseFloat(item.highPrice),
          lowPrice: parseFloat(item.lowPrice),
          volume: parseFloat(item.volume),
          quoteVolume: parseFloat(item.quoteVolume)
        };
      });
      return map;
    } catch (e) {
      return {};
    }
  },

  async fetchAssetHistory(symbol, timeframe = "30D") {
    const cacheKey = `${symbol}_${timeframe}`;
    if (this.cache.historyCache[cacheKey]) {
      return this.cache.historyCache[cacheKey];
    }

    const fiatSymbols = ["EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "CNY", "INR"];
    let history;

    if (fiatSymbols.includes(symbol.toUpperCase())) {
      history = await this.fetchFiatHistorical(symbol.toUpperCase(), timeframe);
    } else if (symbol.toUpperCase() === "ETH_BTC") {
      history = await this.fetchEthBtcRatioHistory(timeframe);
    } else if (symbol.toUpperCase().startsWith("SMA_")) {
      const baseSymbol = symbol.split("_")[1];
      const period = parseInt(symbol.split("_")[2], 10) || 7;
      const baseHistory = await this.fetchAssetHistory(baseSymbol, timeframe);
      history = this.calculateMovingAverage(baseHistory, period);
    } else {
      history = await this.fetchCryptoHistorical(symbol.toUpperCase(), timeframe);
    }

    this.cache.historyCache[cacheKey] = history;
    return history;
  },

  async fetchCryptoHistorical(symbol, timeframe) {
    const binanceSymbol = `${symbol}USDT`;
    const intervalMap = {
      "24H": { interval: "15m", limit: 96 },
      "7D": { interval: "2h", limit: 84 },
      "30D": { interval: "1d", limit: 30 },
      "90D": { interval: "1d", limit: 90 },
      "1Y": { interval: "1w", limit: 52 },
      "5Y": { interval: "1M", limit: 60 }
    };

    const config = intervalMap[timeframe] || intervalMap["30D"];

    try {
      const res = await fetch(`${this.sources.binance}/klines?symbol=${binanceSymbol}&interval=${config.interval}&limit=${config.limit}`);
      if (!res.ok) throw new Error("Binance klines failed");
      const raw = await res.json();
      
      const labels = [];
      const values = [];

      raw.forEach(k => {
        const time = new Date(k[0]);
        let labelStr = "";
        if (timeframe === "24H") {
          labelStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (timeframe === "7D" || timeframe === "30D" || timeframe === "90D") {
          labelStr = `${time.getMonth() + 1}/${time.getDate()}`;
        } else {
          labelStr = `${time.getFullYear()}-${time.getMonth() + 1}`;
        }
        labels.push(labelStr);
        values.push(parseFloat(k[4]));
      });

      return { labels, values, symbol, timeframe, currency: "USD" };
    } catch (e) {
      return this.generateSimulatedHistory(symbol, timeframe);
    }
  },

  async fetchFiatHistorical(fiatSymbol, timeframe) {
    const daysMap = { "24H": 1, "7D": 7, "30D": 30, "90D": 90, "1Y": 365, "5Y": 1825 };
    const days = daysMap[timeframe] || 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const formatDt = (d) => d.toISOString().split("T")[0];

    try {
      const url = `${this.sources.frankfurter}/${formatDt(startDate)}..${formatDt(endDate)}?base=USD&symbols=${fiatSymbol}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Frankfurter history failed");
      const data = await res.json();

      const labels = [];
      const values = [];

      const sortedDates = Object.keys(data.rates || {}).sort();
      sortedDates.forEach(dt => {
        const dateObj = new Date(dt);
        let labelStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        if (timeframe === "1Y" || timeframe === "5Y") {
          labelStr = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}`;
        }
        labels.push(labelStr);
        values.push(data.rates[dt][fiatSymbol]);
      });

      if (labels.length === 0) {
        return this.generateSimulatedHistory(fiatSymbol, timeframe, 1.1);
      }

      return { labels, values, symbol: fiatSymbol, timeframe, currency: "USD Rate" };
    } catch (e) {
      return this.generateSimulatedHistory(fiatSymbol, timeframe, 1.1);
    }
  },

  async fetchEthBtcRatioHistory(timeframe) {
    const ethData = await this.fetchAssetHistory("ETH", timeframe);
    const btcData = await this.fetchAssetHistory("BTC", timeframe);

    const minLen = Math.min(ethData.values.length, btcData.values.length);
    const labels = ethData.labels.slice(-minLen);
    const values = [];

    const ethSlice = ethData.values.slice(-minLen);
    const btcSlice = btcData.values.slice(-minLen);

    for (let i = 0; i < minLen; i++) {
      const ratio = btcSlice[i] > 0 ? (ethSlice[i] / btcSlice[i]) : 0;
      values.push(parseFloat(ratio.toFixed(5)));
    }

    return {
      labels,
      values,
      symbol: "ETH/BTC Ratio",
      timeframe,
      currency: "BTC"
    };
  },

  calculateMovingAverage(historyData, period = 7) {
    const vals = historyData.values;
    const labels = historyData.labels;
    const smaValues = [];

    for (let i = 0; i < vals.length; i++) {
      if (i < period - 1) {
        smaValues.push(vals[i]);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += vals[i - j];
        }
        smaValues.push(parseFloat((sum / period).toFixed(2)));
      }
    }

    return {
      labels,
      values: smaValues,
      symbol: `SMA-${period} (${historyData.symbol})`,
      timeframe: historyData.timeframe,
      currency: historyData.currency
    };
  },

  calculateNormalizedData(datasets) {
    return datasets.map(ds => {
      const baseValue = ds.values[0] || 1;
      const normalizedValues = ds.values.map(v => parseFloat(((v / baseValue) * 100).toFixed(2)));
      return {
        ...ds,
        values: normalizedValues,
        currency: "Index (Base 100)"
      };
    });
  },

  calculatePurchasingPower(cryptoPriceUsd, fiatRate) {
    if (!cryptoPriceUsd || !fiatRate) return 0;
    return parseFloat((cryptoPriceUsd * fiatRate).toFixed(2));
  },

  generateSimulatedHistory(symbol, timeframe, base = null) {
    const pointsMap = { "24H": 24, "7D": 28, "30D": 30, "90D": 45, "1Y": 52, "5Y": 60 };
    const points = pointsMap[timeframe] || 30;

    let startVal = base;
    if (!startVal) {
      const prices = {
        BTC: 84200,
        ETH: 2680,
        SOL: 155,
        DOGE: 0.18,
        XRP: 0.62,
        ADA: 0.45,
        BNB: 590,
        AVAX: 28,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 155.2,
        CAD: 1.38,
        CHF: 0.88,
        AUD: 1.52
      };
      startVal = prices[symbol.toUpperCase()] || 100;
    }

    const labels = [];
    const values = [];
    let current = startVal * 0.88;

    const now = new Date();
    for (let i = points; i >= 0; i--) {
      const d = new Date();
      if (timeframe === "24H") {
        d.setHours(now.getHours() - i);
        labels.push(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else if (timeframe === "7D" || timeframe === "30D" || timeframe === "90D") {
        d.setDate(now.getDate() - i);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      } else {
        d.setMonth(now.getMonth() - i);
        labels.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
      }

      const variation = (Math.random() - 0.48) * (startVal * 0.035);
      current = Math.max(current + variation, startVal * 0.4);
      values.push(parseFloat(current.toFixed(current > 10 ? 2 : 4)));
    }

    return {
      labels,
      values,
      symbol,
      timeframe,
      currency: "USD"
    };
  },

  getFallbackCryptoData() {
    return [
      { id: "btc-bitcoin", name: "Bitcoin", symbol: "BTC", rank: 1, priceUsd: 84320.50, volume24h: 28540000000, marketCap: 1660000000000, change1h: 0.25, change24h: 2.84, change7d: 5.12, change30d: 14.2, change1y: 112.5, athPrice: 99800, athDate: "2024-11-22T00:00:00Z", percentFromAth: -15.5 },
      { id: "eth-ethereum", name: "Ethereum", symbol: "ETH", rank: 2, priceUsd: 2685.20, volume24h: 14230000000, marketCap: 323000000000, change1h: -0.15, change24h: 1.45, change7d: 3.80, change30d: 8.4, change1y: 65.2, athPrice: 4891, athDate: "2021-11-16T00:00:00Z", percentFromAth: -45.1 },
      { id: "sol-solana", name: "Solana", symbol: "SOL", rank: 3, priceUsd: 156.40, volume24h: 3820000000, marketCap: 73000000000, change1h: 0.85, change24h: 4.60, change7d: 12.30, change30d: 22.1, change1y: 210.4, athPrice: 260, athDate: "2021-11-06T00:00:00Z", percentFromAth: -39.8 },
      { id: "doge-dogecoin", name: "Dogecoin", symbol: "DOGE", rank: 4, priceUsd: 0.185, volume24h: 1450000000, marketCap: 27000000000, change1h: -0.40, change24h: -1.20, change7d: 8.90, change30d: 18.5, change1y: 140.0, athPrice: 0.73, athDate: "2021-05-08T00:00:00Z", percentFromAth: -74.6 },
      { id: "xrp-xrp", name: "XRP", symbol: "XRP", rank: 5, priceUsd: 0.625, volume24h: 1980000000, marketCap: 35000000000, change1h: 0.10, change24h: 1.80, change7d: 4.10, change30d: 6.2, change1y: 22.8, athPrice: 3.84, athDate: "2018-01-04T00:00:00Z", percentFromAth: -83.7 },
      { id: "ada-cardano", name: "Cardano", symbol: "ADA", rank: 6, priceUsd: 0.458, volume24h: 480000000, marketCap: 16500000000, change1h: -0.20, change24h: 0.95, change7d: 2.10, change30d: 4.8, change1y: 35.1, athPrice: 3.10, athDate: "2021-09-02T00:00:00Z", percentFromAth: -85.2 },
      { id: "bnb-binancecoin", name: "BNB", symbol: "BNB", rank: 7, priceUsd: 592.10, volume24h: 980000000, marketCap: 86000000000, change1h: 0.05, change24h: 1.10, change7d: 3.40, change30d: 7.9, change1y: 78.4, athPrice: 720, athDate: "2024-06-06T00:00:00Z", percentFromAth: -17.7 },
      { id: "avax-avalanche", name: "Avalanche", symbol: "AVAX", rank: 8, priceUsd: 28.75, volume24h: 340000000, marketCap: 11500000000, change1h: 0.60, change24h: 3.20, change7d: 7.80, change30d: 11.4, change1y: 45.6, athPrice: 146, athDate: "2021-11-21T00:00:00Z", percentFromAth: -80.3 }
    ];
  },

  getFallbackFiatData() {
    return {
      base: "USD",
      date: new Date().toISOString().split("T")[0],
      rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 155.2,
        CAD: 1.38,
        CHF: 0.88,
        AUD: 1.52,
        CNY: 7.24,
        INR: 84.5
      }
    };
  }
};
