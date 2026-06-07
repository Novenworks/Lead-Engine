import { useDroppable } from "@dnd-kit/core";
import { Lead } from "@workspace/api-client-react";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  New: "border-blue-400",
  Contacted: "border-amber-400",
  Booked: "border-purple-400",
  Won: "border-emerald-400",
  Lost: "border-red-300",
};

const STATUS_DOT: Record<string, string> = {
  New: "bg-blue-400",
  Contacted: "bg-amber-400",
  Booked: "bg-purple-400",
  Won: "bg-emerald-400",
  Lost: "bg-red-400",
};

const STATUS_VALUE_COLOR: Record<string, string> = {
  New: "text-blue-600",
  Contacted: "text-amber-600",
  Booked: "text-purple-600",
  Won: "text-emerald-600",
  Lost: "text-slate-400",
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

  const totalValue = leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
  const totalMrr = leads.reduce((sum, l) => sum + (l.monthlyRecurringValue ?? 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] max-w-[260px] shrink-0">
      {/* Column header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-t-lg border-t-2 bg-slate-50 border-l border-r border-slate-200",
        STATUS_COLORS[status]
      )}>
        <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[status])} />
        <span className="font-semibold text-sm flex-1 truncate">{status}</span>
        <span className="text-xs font-medium text-muted-foreground bg-white px-1.5 py-0.5 rounded border">
          {leads.length}
        </span>
      </div>

      {/* Value summary */}
      <div className={cn(
        "px-3 py-1.5 bg-slate-50 border-l border-r border-slate-200 text-xs flex items-center justify-between min-h-[28px]",
      )}>
        {totalValue > 0 ? (
          <span className={cn("font-semibold", STATUS_VALUE_COLOR[status])}>
            {currency(totalValue)} pipeline
          </span>
        ) : (
          <span className="text-slate-300 text-[11px]">{leads.length === 0 ? "empty" : "no values set"}</span>
        )}
        {totalMrr > 0 && (
          <span className="text-purple-500 font-medium text-[11px]">{currency(totalMrr)}/mo</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[200px] p-2 space-y-2 border border-t-0 border-slate-200 rounded-b-lg transition-colors",
          isOver ? "bg-blue-50/80 border-blue-200" : "bg-slate-50/50",
        )}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
        ))}
        {leads.length === 0 && (
          <div className={cn(
            "h-16 flex items-center justify-center text-xs rounded-lg border-2 border-dashed transition-colors",
            isOver ? "border-blue-300 text-blue-400 bg-blue-50" : "border-slate-200 text-slate-300",
          )}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
