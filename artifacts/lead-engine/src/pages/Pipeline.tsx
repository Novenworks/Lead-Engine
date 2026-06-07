import { useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { useListLeads, useUpdateLead, getListLeadsQueryKey, Lead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadDrawer } from "@/components/LeadDrawer";
import { useToast } from "@/hooks/use-toast";
import { Kanban } from "lucide-react";

const STATUSES = ["New", "Contacted", "Booked", "Won", "Lost"] as const;

export default function Pipeline() {
  const { data: user } = useGetMe();
  const { data: leads = [], isLoading } = useListLeads();
  const updateLead = useUpdateLead();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const leadsByStatus: Record<string, Lead[]> = Object.fromEntries(
    STATUSES.map((s) => [s, leads.filter((l) => l.status === s)]),
  );

  const handleDragStart = (event: any) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setDraggingLead(lead ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingLead(null);
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
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <Kanban className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isLoading ? "Loading..." : `${leads.length} leads · $${pipelineValue.toLocaleString()} active pipeline`}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading pipeline...</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
