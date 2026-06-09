import markBadgeImg from "@assets/Opera_Snapshot_2026-06-08_190824_chatgpt.com_1780970995851.png";
import markLargeImg from "@assets/Opera_Snapshot_2026-06-08_190833_chatgpt.com_1780970995851.png";
import logoHorizontalImg from "@assets/Opera_Snapshot_2026-06-08_190917_chatgpt.com_1780970995850.png";
import logoVerticalImg from "@assets/Opera_Snapshot_2026-06-08_190923_chatgpt.com_1780970995849.png";
import markSmallImg from "@assets/Opera_Snapshot_2026-06-08_190929_chatgpt.com_1780970995847.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export function LEMark({ size = 32, className }: LogoProps) {
  const src = size <= 20 ? markSmallImg : markLargeImg;
  return (
    <img
      src={src}
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
      src={markBadgeImg}
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
      src={logoHorizontalImg}
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
      src={logoVerticalImg}
      height={height}
      style={{ display: "block", objectFit: "contain", maxWidth: "100%" }}
      className={className}
      alt="LeadEngine by Novenworks"
      draggable={false}
    />
  );
}

export const LogoIconBadge = LEMarkBadge;
export const LogoWordmark = LEWordmark;
export const LogoIcon = LEMark;
export const LogoIconBadge2 = LEMarkBadge;
