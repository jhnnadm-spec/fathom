/**
 * Calm moving water behind every page: soft light drifting down from the surface
 * and slow waves rolling along the bottom of the screen. It stays faint so it never
 * competes with the text, and it holds still for anyone who has asked their device
 * for less motion.
 */

// A gentle swell repeated across a strip twice the screen's width; the strip slides by half
// its width and starts over, which looks the same, so the waves roll forever without a seam.
function wave(amp: number, base: number, swells: number) {
  const w = 2880 / swells;
  const seg = (x: number) => `C${x + w / 8},${base - amp} ${x + (3 * w) / 8},${base - amp} ${x + w / 2},${base} S${x + (7 * w) / 8},${base + amp} ${x + w},${base}`;
  const segs = Array.from({ length: swells }, (_, i) => seg(i * w)).join(" ");
  return `M0,${base} ${segs} L2880,160 L0,160 Z`;
}

const WAVES = [
  { d: wave(20, 64, 4), fill: "#7fc4d8", opacity: 0.13, cls: "fathom-sea-wave-1" },
  { d: wave(24, 90, 6), fill: "#2f8fb3", opacity: 0.08, cls: "fathom-sea-wave-2" },
  { d: wave(16, 116, 4), fill: "#0b4f6c", opacity: 0.05, cls: "fathom-sea-wave-3" },
];

export function SeaBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Light from the surface, drifting slowly */}
      <div className="fathom-sea-light fathom-sea-light-1" />
      <div className="fathom-sea-light fathom-sea-light-2" />
      <div className="fathom-sea-rays" />

      {/* Waves rolling along the bottom */}
      <div className="fathom-sea-waves absolute inset-x-0 bottom-0 h-[160px]">
        {WAVES.map((w) => (
          <svg
            key={w.cls}
            className={`fathom-sea-wave ${w.cls}`}
            viewBox="0 0 2880 160"
            preserveAspectRatio="none"
          >
            <path d={w.d} fill={w.fill} fillOpacity={w.opacity} />
          </svg>
        ))}
      </div>
    </div>
  );
}
