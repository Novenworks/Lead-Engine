const MARK_URL       = "/logos/le-mark-crop.png";
const BADGE_URL      = "/logos/le-badge-crop.png";
const HORIZONTAL_URL = "/logos/le-horizontal-crop.png";
const VERTICAL_URL   = "/logos/le-vertical-crop.png";

interface LogoProps {
  size?: number;
  className?: string;
}

/** Standalone LE monogram — screen-blended so background disappears on dark pages */
export function LEMark({ size = 32, className }: LogoProps) {
  return (
    <img
      src={MARK_URL}
      alt="LE"
      draggable={false}
      className={className}
      style={{ display: "block", width: size, height: size, objectFit: "contain", flexShrink: 0, mixBlendMode: "screen" }}
    />
  );
}

/** Rounded-square app icon — intentionally opaque badge design */
export function LEMarkBadge({ size = 36 }: { size?: number }) {
  return (
    <img
      src={BADGE_URL}
      alt="LeadEngine"
      draggable={false}
      style={{ display: "block", width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

/** Horizontal lockup: LE mark + "LeadEngine BY NOVENWORKS" — screen-blended */
export function LEWordmark({
  compact = false,
  dark: _dark = true,
  className,
}: {
  dark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const h = compact ? 32 : 44;
  // Aspect ratio of le-horizontal-crop.png: 450 × 165 ≈ 2.727:1
  const w = Math.round(h * (450 / 165));
  return (
    <img
      src={HORIZONTAL_URL}
      alt="LeadEngine by Novenworks"
      draggable={false}
      className={className}
      style={{ display: "block", width: w, height: h, objectFit: "contain", mixBlendMode: "screen" }}
    />
  );
}

/** Vertical lockup: LE mark stacked above wordmark — screen-blended */
export function LEVertical({ height = 88, className }: { height?: number; className?: string }) {
  // Aspect ratio of le-vertical-crop.png: 355 × 250 ≈ 1.42:1
  const w = Math.round(height * (355 / 250));
  return (
    <img
      src={VERTICAL_URL}
      alt="LeadEngine by Novenworks"
      draggable={false}
      className={className}
      style={{ display: "block", width: w, height: height, objectFit: "contain", mixBlendMode: "screen" }}
    />
  );
}

export const LogoIconBadge  = LEMarkBadge;
export const LogoWordmark   = LEWordmark;
export const LogoIcon       = LEMark;
export const LogoIconBadge2 = LEMarkBadge;
