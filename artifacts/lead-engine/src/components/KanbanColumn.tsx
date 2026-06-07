import { useDroppable } from "@dnd-kit/core";
import { Lead } from "@workspace/api-client-react";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

const STATUS_ACCENT: Record<string, { stripe: string; dot: string; val: string; glow: string }> = {
  New: { stripe: "#2563EB", dot: "#60a5fa", val: "#60a5fa", glow: "rgba(37,99,235,0.08)" },
  Contacted: { stripe: "#f59e0b", dot: "#fbbf24", val: "#fbbf24", glow: "rgba(245,158,11,0.06)" },
  Booked: { stripe: "#a855f7", dot: "#c084fc", val: "#c084fc", glow: "rgba(168,85,247,0.06)" },
  Won: { stripe: "#22c55e", dot: "#4ade80", val: "#4ade80", glow: "rgba(34,197,94,0.07)" },
  Lost: { stripe: "#475569", dot: "#64748b", val: "#64748b", glow: "transparent" },
};

interface KanbanColumnProps {
  status: string;
  leads: Lead[];
  onLeadClick: (id: number) => void;
}

function currency(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export function KanbanColumn({ status, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = STATUS_ACCENT[status] ?? STATUS_ACCENT.Lost;

  const totalValue = leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
  const totalMrr = leads.reduce((sum, l) => sum + (l.monthlyRecurringValue ?? 0), 0);

  return (
    <div className="flex flex-col min-w-[265px] max-w-[265px] shrink-0">
      {/* Column header */}
      <div
        className="rounded-t-xl px-3 py-2.5"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderTop: `2px solid ${accent.stripe}`,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent.dot }} />
          <span className="font-bold text-sm text-white flex-1 truncate">{status}</span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.07)", color: "#64748b" }}
          >
            {leads.length}
          </span>
        </div>
        {/* Value sub-line */}
        <div className="mt-1.5 flex items-center justify-between min-h-[16px]">
          {totalValue > 0 ? (
            <span className="text-[11px] font-bold" style={{ color: accent.val }}>
              {currency(totalValue)}
            </span>
          ) : (
            <span className="text-[11px] text-slate-800">{leads.length === 0 ? "empty" : "no values"}</span>
          )}
          {totalMrr > 0 && (
            <span className="text-[11px] font-semibold" style={{ color: "#c084fc" }}>
              {currency(totalMrr)}/mo
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[200px] p-2 space-y-2 rounded-b-xl transition-all duration-150"
        style={{
          background: isOver
            ? "rgba(37,99,235,0.08)"
            : `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, ${accent.glow} 100%)`,
          border: isOver
            ? "1px solid rgba(37,99,235,0.3)"
            : "1px solid rgba(255,255,255,0.07)",
          borderTop: "none",
        }}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
        ))}
        {leads.length === 0 && (
          <div
            className="h-16 flex items-center justify-center text-xs rounded-lg transition-colors"
            style={{
              border: isOver ? "2px dashed rgba(37,99,235,0.4)" : "2px dashed rgba(255,255,255,0.07)",
              color: isOver ? "#60a5fa" : "#334155",
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
