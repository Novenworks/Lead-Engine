interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 2L4 7.5V16c0 6.3 4.8 12.2 12 13.9 7.2-1.7 12-7.6 12-13.9V7.5L16 2z"
        fill="#0f172a"
        stroke="#1e3a5f"
        strokeWidth="0.5"
      />
      <circle cx="16" cy="14.5" r="2.8" fill="#3b82f6" />
      <circle cx="10.5" cy="10" r="2" fill="#60a5fa" />
      <circle cx="21.5" cy="10" r="2" fill="#60a5fa" />
      <circle cx="16" cy="21.5" r="2" fill="#60a5fa" />
      <line x1="10.5" y1="10" x2="16" y2="14.5" stroke="#3b82f6" strokeWidth="1.3" strokeOpacity="0.9" />
      <line x1="21.5" y1="10" x2="16" y2="14.5" stroke="#3b82f6" strokeWidth="1.3" strokeOpacity="0.9" />
      <line x1="16" y1="14.5" x2="16" y2="21.5" stroke="#3b82f6" strokeWidth="1.3" strokeOpacity="0.9" />
      <line x1="10.5" y1="10" x2="21.5" y2="10" stroke="#60a5fa" strokeWidth="0.9" strokeOpacity="0.55" />
    </svg>
  );
}

interface LogoWordmarkProps {
  iconSize?: number;
  dark?: boolean;
  className?: string;
}

export function LogoWordmark({ iconSize = 36, dark = false, className }: LogoWordmarkProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LogoIconBadge size={iconSize} />
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight ${iconSize >= 40 ? "text-2xl" : "text-lg"} ${dark ? "text-white" : "text-slate-900"}`}>
          LeadEngine
        </span>
        <span className={`text-[10px] font-semibold tracking-[0.2em] uppercase mt-0.5 ${dark ? "text-blue-400" : "text-slate-500"}`}>
          by Novenworks
        </span>
      </div>
    </div>
  );
}

export function LogoIconBadge({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        boxShadow: "0 0 0 1px rgba(59,130,246,0.3)",
      }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11 1L2 5.5V11c0 4.3 3.3 8.4 9 9.8 5.7-1.4 9-5.5 9-9.8V5.5L11 1z"
          fill="#0f172a"
          stroke="#1e3a5f"
          strokeWidth="0.5"
        />
        <circle cx="11" cy="10" r="2" fill="#3b82f6" />
        <circle cx="7" cy="7" r="1.5" fill="#60a5fa" />
        <circle cx="15" cy="7" r="1.5" fill="#60a5fa" />
        <circle cx="11" cy="15" r="1.5" fill="#60a5fa" />
        <line x1="7" y1="7" x2="11" y2="10" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.9" />
        <line x1="15" y1="7" x2="11" y2="10" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.9" />
        <line x1="11" y1="10" x2="11" y2="15" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.9" />
        <line x1="7" y1="7" x2="15" y2="7" stroke="#60a5fa" strokeWidth="0.7" strokeOpacity="0.6" />
      </svg>
    </div>
  );
}
