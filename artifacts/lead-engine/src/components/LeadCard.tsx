import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@workspace/api-client-react";
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
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isDragging ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
        border: isDragging ? "1px solid rgba(37,99,235,0.5)" : "1px solid rgba(255,255,255,0.09)",
        borderRadius: "10px",
        padding: "12px",
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "background 0.15s, box-shadow 0.15s, transform 0.15s",
        boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.2)",
        userSelect: "none",
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
          (e.currentTarget as HTMLElement).style.transform = style.transform ?? "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
          (e.currentTarget as HTMLElement).style.transform = style.transform ?? "";
        }
      }}
      {...attributes}
    >
      <div {...listeners} className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <button
            className="font-semibold text-sm text-slate-100 hover:text-blue-300 text-left leading-tight transition-colors"
            onClick={(e) => { e.stopPropagation(); onClick(lead.id); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {lead.name}
          </button>
        </div>
        {lead.serviceInterest && (
          <p className="text-xs text-slate-600 mt-0.5 truncate">{lead.serviceInterest}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0">
          <span className="truncate">{format(new Date(lead.createdAt), "MMM d")}</span>
          {lead.source && (
            <>
              <span className="text-slate-800">·</span>
              <span className="truncate flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5 shrink-0" />
                {lead.source}
              </span>
            </>
          )}
        </div>
        {lead.estimatedValue != null && (
          <span
            className="text-xs font-bold flex items-center gap-0.5 shrink-0"
            style={{ color: "#4ade80" }}
          >
            <DollarSign className="h-3 w-3" />
            {lead.estimatedValue.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
