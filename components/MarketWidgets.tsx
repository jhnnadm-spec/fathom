import { TradingViewWidget } from "./TradingViewWidget";

/** The share price chart, with TradingView's own date-range buttons. */
export function PriceChart({ symbol }: { symbol: string }) {
  return (
    <TradingViewWidget
      script="mini-symbol-overview"
      height={260}
      config={{
        symbol,
        width: "100%",
        height: "100%",
        locale: "en",
        dateRange: "12M",
        colorTheme: "light",
        isTransparent: true,
        autosize: true,
        chartOnly: false,
        trendLineColor: "rgba(11, 79, 108, 1)",
        underLineColor: "rgba(47, 143, 179, 0.25)",
        underLineBottomColor: "rgba(47, 143, 179, 0)",
      }}
      attribution={{ href: `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`, text: `${symbol} chart` }}
    />
  );
}

/** Market data such as market value and P/E, shown exactly as TradingView provides it. */
export function MarketData({ symbol }: { symbol: string }) {
  return (
    <TradingViewWidget
      script="financials"
      height={640}
      config={{
        symbol,
        width: "100%",
        height: "100%",
        autosize: true,
        colorTheme: "light",
        isTransparent: true,
        displayMode: "regular",
        locale: "en",
      }}
      attribution={{
        href: `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/financials-overview/`,
        text: `${symbol} fundamentals`,
      }}
    />
  );
}

/** News headlines about this company, from TradingView's news feed. */
export function CompanyNews({ symbol }: { symbol: string }) {
  return (
    <TradingViewWidget
      script="timeline"
      height={520}
      config={{
        feedMode: "symbol",
        symbol,
        width: "100%",
        height: "100%",
        autosize: true,
        colorTheme: "light",
        isTransparent: true,
        displayMode: "regular",
        locale: "en",
      }}
      attribution={{ href: `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/news/`, text: `${symbol} news` }}
    />
  );
}
