import { useDroppable } from "@dnd-kit/core";
import { Lead } from "@workspace/api-client-react";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  New: "border-blue-400",
  Contacted: "border-amber-400",
  Booked: "border-purple-400",
  Won: "border-green-400",
  Lost: "border-red-300",
};

const STATUS_DOT: Record<string, string> = {
  New: "bg-blue-400",
  Contacted: "bg-amber-400",
  Booked: "bg-purple-400",
  Won: "bg-green-400",
  Lost: "bg-red-400",
};

interface KanbanColumnProps {
  status: string;
  leads: Lead[];
  onLeadClick: (id: number) => void;
}

export function KanbanColumn({ status, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const totalValue = leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] max-w-[260px] shrink-0">
      {/* Column header */}
      <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-t-lg border-t-2 bg-slate-50 border-l border-r border-slate-200", STATUS_COLORS[status])}>
        <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[status])} />
        <span className="font-semibold text-sm flex-1 truncate">{status}</span>
        <span className="text-xs font-medium text-muted-foreground bg-white px-1.5 py-0.5 rounded border">{leads.length}</span>
      </div>

      {totalValue > 0 && (
        <div className="px-3 py-1 bg-slate-50 border-l border-r border-slate-200 text-xs text-muted-foreground">
          ${totalValue.toLocaleString()} pipeline
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[200px] p-2 space-y-2 border border-t-0 border-slate-200 rounded-b-lg transition-colors",
          isOver ? "bg-blue-50" : "bg-slate-50/50",
        )}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
        ))}
        {leads.length === 0 && (
          <div className="h-16 flex items-center justify-center text-xs text-slate-300 border-2 border-dashed border-slate-200 rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
