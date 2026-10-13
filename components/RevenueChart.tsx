import { formatDate, formatMoney } from "@/lib/financials/format";
import type { Figure } from "@/lib/financials/metrics";

/**
 * Yearly revenue as simple bars. One colour, a label on the latest year only,
 * a tooltip on every bar, and the same numbers as a table for screen readers.
 */
export function RevenueChart({ history }: { history: Figure[] }) {
  if (history.length < 2) return null;
  const width = 560;
  const height = 200;
  const top = 28; // room for the latest value's label
  const bottom = 28; // room for the year labels
  const plot = height - top - bottom;
  const max = Math.max(...history.map((f) => f.value));
  const slot = width / history.length;
  const barWidth = Math.min(64, slot * 0.56);

  return (
    <figure className="m-0 flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Yearly revenue from ${history[0].end.slice(0, 4)} to ${history.at(-1)!.end.slice(0, 4)}`}
      >
        <line x1="0" x2={width} y1={height - bottom} y2={height - bottom} stroke="#DCE8EE" strokeWidth="1" />
        {history.map((f, i) => {
          const h = Math.max(2, (f.value / max) * plot);
          const x = i * slot + (slot - barWidth) / 2;
          const y = height - bottom - h;
          const latest = i === history.length - 1;
          const r = 4;
          // Rounded top corners only; the bar sits flat on the baseline.
          const path = `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${x + barWidth},${y} ${x + barWidth},${y + r} V${y + h} Z`;
          return (
            <g key={f.end}>
              <path d={path} fill={latest ? "#0B4F6C" : "#2F8FB3"}>
                <title>{`Year ended ${formatDate(f.end)}: ${formatMoney(f.value)}`}</title>
              </path>
              {/* A bigger invisible target so the tooltip is easy to hit. */}
              <rect x={i * slot} y={top} width={slot} height={plot} fill="transparent">
                <title>{`Year ended ${formatDate(f.end)}: ${formatMoney(f.value)}`}</title>
              </rect>
              {latest && (
                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="14" fontWeight="600" fill="#0A2A3A">
                  {formatMoney(f.value)}
                </text>
              )}
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="13" fill="#3D5A69">
                {f.end.slice(0, 4)}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="text-sm text-muted">
        <summary className="cursor-pointer font-medium text-ocean">Show as a table</summary>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="py-1.5 font-semibold">Year ended</th>
              <th className="py-1.5 text-right font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {history.map((f) => (
              <tr key={f.end} className="border-b border-line/60">
                <td className="py-1.5">{formatDate(f.end)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMoney(f.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
