const MARK_URL       = "/logos/le-mark-crop.png";
const BADGE_URL      = "/logos/le-badge-crop.png";
const HORIZONTAL_URL = "/logos/le-horizontal-crop.png";
const VERTICAL_URL   = "/logos/le-vertical-crop.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export function LEMark({ size = 32, className }: LogoProps) {
  return (
    <img
      src={MARK_URL}
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain", flexShrink: 0 }}
      className={className}
      alt="LE"
      draggable={false}
    />
  );
}

export function LEMarkBadge({ size = 36 }: { size?: number }) {
  return (
    <img
      src={BADGE_URL}
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain", flexShrink: 0 }}
      alt="LeadEngine"
      draggable={false}
    />
  );
}

export function LEWordmark({
  compact = false,
  dark: _dark = true,
  className,
}: {
  dark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const height = compact ? 30 : 42;
  return (
    <img
      src={HORIZONTAL_URL}
      height={height}
      style={{ display: "block", objectFit: "contain", maxWidth: "100%" }}
      className={className}
      alt="LeadEngine by Novenworks"
      draggable={false}
    />
  );
}

export function LEVertical({
  height = 88,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={VERTICAL_URL}
      height={height}
      style={{ display: "block", objectFit: "contain", maxWidth: "100%" }}
      className={className}
      alt="LeadEngine by Novenworks"
      draggable={false}
    />
  );
}

export const LogoIconBadge  = LEMarkBadge;
export const LogoWordmark   = LEWordmark;
export const LogoIcon       = LEMark;
export const LogoIconBadge2 = LEMarkBadge;
