import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@workspace/api-client-react";
import { LeadBadge } from "./LeadBadge";
import { format } from "date-fns";
import { DollarSign, Tag } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onClick: (id: number) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing select-none"
    >
      {/* Drag handle area + click area */}
      <div {...listeners} className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <button
            className="font-medium text-sm text-slate-900 hover:text-primary text-left leading-tight"
            onClick={(e) => { e.stopPropagation(); onClick(lead.id); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {lead.name}
          </button>
        </div>
        {lead.serviceInterest && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{lead.serviceInterest}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
          <span className="truncate">{format(new Date(lead.createdAt), "MMM d")}</span>
          {lead.source && (
            <>
              <span>·</span>
              <span className="truncate flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5 shrink-0" />
                {lead.source}
              </span>
            </>
          )}
        </div>
        {lead.estimatedValue != null && (
          <span className="text-xs font-medium text-green-600 flex items-center gap-0.5 shrink-0">
            <DollarSign className="h-3 w-3" />
            {lead.estimatedValue.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
