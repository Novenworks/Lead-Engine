import { useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useListLeads, useUpdateLead, getListLeadsQueryKey, Lead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadDrawer } from "@/components/LeadDrawer";
import { useToast } from "@/hooks/use-toast";
import { Kanban } from "lucide-react";

const STATUSES = ["New", "Contacted", "Booked", "Won", "Lost"] as const;

function currency(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export default function Pipeline() {
  const { data: user } = useGetMe();
  const { data: leads = [], isLoading } = useListLeads();
  const updateLead = useUpdateLead();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const leadsByStatus: Record<string, Lead[]> = Object.fromEntries(
    STATUSES.map((s) => [s, leads.filter((l) => l.status === s)]),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newStatus = String(over.id);
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.status === newStatus) return;
    updateLead.mutate({ id: lead.id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        toast({ title: `${lead.name} moved to ${newStatus}` });
      },
    });
  };

  const pipelineValue = leads
    .filter((l) => ["New", "Contacted", "Booked"].includes(l.status))
    .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(37,99,235,0.15)" }}
          >
            <Kanban className="h-4.5 w-4.5 text-blue-400" style={{ width: "18px", height: "18px" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Move leads from first touch to won revenue ·{" "}
              {isLoading
                ? "Loading…"
                : <span className="text-slate-600">{leads.length} leads · <span style={{ color: "#4ade80" }}>{currency(pipelineValue)} active</span></span>
              }
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-600">Loading pipeline...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={leadsByStatus[status] ?? []}
                onLeadClick={(id) => setSelectedLeadId(id)}
              />
            ))}
          </div>
        </DndContext>
      )}

      <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
