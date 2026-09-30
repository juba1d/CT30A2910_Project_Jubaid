# Course Project Report: Money and Crypto Portal

* **Student Name:** Jubaid Rusho
* **Student ID:** 003257973
* **GitHub:** https://github.com/juba1d
* **Date:** Autumn 2026

---

## 1. What Was Done
I built a money and cryptocurrency portal using basic HTML, CSS and JavaScript without any JS frameworks. The application gets live data from three public APIs (Coinpaprika, Frankfurter and Binance).

The main parts of the project are:
* **Multi-Charts:** Users can drag and drop currency items directly onto charts to compare price lines. Users can also change timeframes (24H, 7D, 30D, 90D, 1Y, 5Y), change line colors, open multiple charts side by side and download charts as PNG or SVG images.
* **Portfolio Tracker:** Users can enter their crypto buyings (date, buy price and amount). The app calculates the current value, cost basis and profit/loss in USD, EUR and GBP. It also shows a simple buy, hold or sell recommendation.
* **Purchasing Power Table:** Shows live prices of major cryptos converted into EUR, GBP, JPY, CAD and CHF.
* **Currency Converter:** Lets users convert amounts between crypto and fiat currencies.

---

## 2. Tools Used
* **HTML5, CSS3 and JavaScript (ES6+):** Built with separate files for HTML, CSS and JS.
* **Chart.js:** Used for drawing simple, responsive line charts.
* **Coinpaprika API:** Provides live crypto prices, market caps and price changes.
* **Frankfurter API:** Provides live and historical fiat exchange rates.
* **Binance API:** Provides historical price data for charts.

---

## 3. User Manual
* **Viewing and Comparing Charts:** On the Charts tab, drag any item from the left list and drop it on the chart. To add another chart next to it, click "+ Add Chart". Use the timeframe buttons (24H, 7D, 30D etc.) to switch the period. Click the color circle to pick a new color.
* **Exporting Charts:** Click the "PNG" or "SVG" button on the chart to download the image. Click "Share" to share the chart.
* **Using the Portfolio:** Go to the Portfolio tab, choose a coin, select purchase date, enter buy price and amount, then click "Record Buy". The table displays total value, profit/loss and a recommendation.
* **Checking Details:** Click on any coin in the left list to see 24h high/low, trading volume, market cap and all-time high.

---

## 4. Points Claimed and Justification

| Feature | Max Points | Claimed | Justification |
| :--- | :---: | :---: | :--- |
| **Well written PDF report** | 3 | 3 | Clear PDF report with manual, tools, points table and AI declaration. |
| **Responsive desktop and mobile** | 4 | 4 | Layout works on mobile phones, tablets and desktop screens. |
| **Cross-browser compatibility** | 3 | 3 | Works properly on Chrome, Firefox, Safari and Edge. |
| **Clear directory structure** | 2 | 2 | Separate folders for css, js and docs with separated files. |
| **Drag and drop data to charts** | 4 | 4 | Items can be dragged from the sidebar and dropped onto charts. |
| **Time period selection** | 2 | 2 | Users can choose 24H, 7D, 30D, 90D, 1Y and 5Y periods. |
| **Color selection for currencies** | 2 | 2 | Color picker allows changing line colors for any dataset. |
| **Add new charts next to each other** | 2 | 2 | Users can add multiple chart boxes side by side. |
| **Click data for additional info** | 2 | 2 | Clicking chart points or list items opens detailed coin information. |
| **At least two data providers (2 APIs)** | 3 | 3 | Uses Coinpaprika API and Frankfurter API. |
| **At least three data providers (3 APIs)** | 2 | 2 | Uses Binance API as a third separate service. |
| **Data combined and merged** | 3 | 3 | Combines crypto and fiat rates into purchasing power and ratios. |
| **Portfolio tracker and buy/sell advice** | 5 | 5 | Tracks crypto purchases, calculates profit and gives buy/sell advice. |
| **Download chart as PNG or SVG** | 2 | 2 | Buttons to download the chart as PNG or SVG. |
| **Share visualization to social media** | 2 | 2 | Share modal with quick sharing links and Web Share support. |
| **Own features (Bonus)** | n | 4 | Live price ticker bar, instant converter and localStorage saving. |
| **Total Points Claimed** | **40** | **40** | **All requested features are implemented and working.** |

---

## 5. Declaration of AI Usage
1. **AI System Used:** Gemini 3.7 Flash.
2. **How and Where AI Was Used:**
   * Getting ideas for which public APIs to use without API keys.
   * Planning how to calculate merged data (like crypto purchasing power in EUR and GBP).
   * Proofreading the text and organizing the points justification table for this document.

All code structure, styling and testing were completed to satisfy the course project requirements.
