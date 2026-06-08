import { useId } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * LE Monogram — Option 3 (Final)
 *
 * Shape breakdown (viewBox 0 0 100 100):
 *   Top bar:    full width,  y 0–18   ← E's top tooth
 *   L vertical: x 0–36,     y 18–80  ← wide L bar (36%) gives clear LE read
 *   Middle bar: x 36–88,    y 44–60  ← E's middle tooth, slightly shorter
 *   Bottom bar: full width,  y 80–100 ← L base + E bottom, angled corner
 *
 * Gaps (transparent, show dark background through):
 *   Gap 1: x 36–100, y 18–44
 *   Gap 2: x 36–100, y 60–80
 */
export function LEMark({ size = 32, className }: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const gid = `le-g-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path
        d="M0,0 H100 V18 H36 V44 H88 V60 H36 V80 H100 L92,100 H0 Z"
        fill={`url(#${gid})`}
      />
    </svg>
  );
}

export function LEMarkBadge({ size = 36 }: { size?: number }) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#0B1220",
        borderRadius: Math.round(size * 0.22),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 0 0 1.5px rgba(37,99,235,0.4)",
      }}
    >
      <LEMark size={inner} />
    </div>
  );
}

export function LEWordmark({
  dark = true,
  compact = false,
  className,
}: {
  dark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const iconSize = compact ? 28 : 36;
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LEMarkBadge size={iconSize} />
      <div className="flex flex-col leading-none">
        <span
          className={`font-bold tracking-tight ${compact ? "text-base" : "text-lg"}`}
          style={{ color: dark ? "#FFFFFF" : "#0B1220" }}
        >
          Lead<span style={{ color: "#2563EB" }}>Engine</span>
        </span>
        <span
          className="font-semibold tracking-[0.2em] uppercase mt-0.5"
          style={{
            fontSize: compact ? "8px" : "9px",
            color: dark ? "rgba(147,197,253,0.65)" : "#64748b",
          }}
        >
          by Novenworks
        </span>
      </div>
    </div>
  );
}

export const LogoIconBadge = LEMarkBadge;
export const LogoWordmark = LEWordmark;
export const LogoIcon = LEMark;
export const LogoIconBadge2 = LEMarkBadge;
