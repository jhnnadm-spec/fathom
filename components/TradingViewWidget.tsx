"use client";

import { useEffect, useRef } from "react";

/**
 * Embeds one of TradingView's free widgets.
 *
 * TradingView's terms require their attribution to stay as designed, and their
 * data is for display only. Fathom shows the widget next to its own explanations
 * but never copies, stores or reuses TradingView's numbers.
 */
export function TradingViewWidget({
  script,
  config,
  height,
  attribution,
}: {
  script: "mini-symbol-overview" | "financials" | "timeline";
  config: Record<string, unknown>;
  height: number;
  attribution: { href: string; text: string };
}) {
  const container = useRef<HTMLDivElement>(null);
  const configJson = JSON.stringify(config);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    el.innerHTML = "";
    const target = document.createElement("div");
    target.className = "tradingview-widget-container__widget";
    el.appendChild(target);
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${script}.js`;
    s.async = true;
    s.type = "text/javascript";
    s.innerHTML = configJson;
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
  }, [script, configJson]);

  return (
    <div className="tradingview-widget-container w-full">
      <div ref={container} style={{ height }} className="w-full" />
      <div className="tradingview-widget-copyright text-center text-[13px] leading-8 text-muted">
        <a href={attribution.href} rel="noopener nofollow" target="_blank" className="no-underline">
          <span className="text-ocean">{attribution.text}</span>
        </a>{" "}
        by TradingView
      </div>
    </div>
  );
}
