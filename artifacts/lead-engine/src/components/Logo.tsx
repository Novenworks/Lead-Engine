interface LogoProps {
  size?: number;
  className?: string;
}

export function LEMark({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 112 / 100)}
      viewBox="0 0 100 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* LE monogram: L vertical bar + 3 E bars with white-gap cutouts, angled bottom-right */}
      <path
        d="M0,0 H100 V20 H18 V42 H90 V59 H18 V76 H100 L88,112 H0 Z"
        fill="#2563EB"
      />
    </svg>
  );
}

export function LEMarkBadge({ size = 36 }: { size?: number }) {
  const pad = size * 0.2;
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
