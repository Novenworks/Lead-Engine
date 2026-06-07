import { useState, useEffect } from "react";
import { useGetLead, useUpdateLead, useGetLeadActivity, useCreateLeadActivity, getListLeadsQueryKey, getGetLeadQueryKey, getGetLeadActivityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActivityTimeline } from "./ActivityTimeline";
import { LeadBadge } from "./LeadBadge";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Tag, DollarSign, RefreshCw, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["New", "Contacted", "Booked", "Won", "Lost"] as const;
type Status = typeof STATUSES[number];

interface LeadDrawerProps {
  leadId: number | null;
  onClose: () => void;
}

export function LeadDrawer({ leadId, onClose }: LeadDrawerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: lead, isLoading } = useGetLead(leadId ?? 0);
  const { data: activity, isLoading: activityLoading } = useGetLeadActivity(leadId ?? 0);
  const updateLead = useUpdateLead();
  const addActivity = useCreateLeadActivity();

  const [notes, setNotes] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes ?? "");
      setEstimatedValue(lead.estimatedValue != null ? String(lead.estimatedValue) : "");
      setIsDirty(false);
    }
  }, [lead?.id]);

  const invalidateLeadQueries = () => {
    qc.invalidateQueries({ queryKey: getListLeadsQueryKey() });
    if (leadId) {
      qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      qc.invalidateQueries({ queryKey: getGetLeadActivityQueryKey(leadId) });
    }
  };

  const handleStatusChange = (status: Status) => {
    if (!leadId || !lead || lead.status === status) return;
    updateLead.mutate({ id: leadId, data: { status } }, {
      onSuccess: () => {
        invalidateLeadQueries();
        toast({ title: `Status updated to ${status}` });
      },
    });
  };

  const handleSaveNotes = () => {
    if (!leadId) return;
    updateLead.mutate({ id: leadId, data: { notes, estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null } }, {
      onSuccess: () => {
        setIsDirty(false);
        invalidateLeadQueries();
        toast({ title: "Saved" });
      },
    });
  };

  const handleMarkContacted = () => {
    if (!leadId) return;
    updateLead.mutate({ id: leadId, data: { lastContactedAt: new Date().toISOString(), status: lead?.status === "New" ? "Contacted" : lead?.status } }, {
      onSuccess: () => {
        invalidateLeadQueries();
        toast({ title: "Marked as contacted" });
      },
    });
  };

  const handleAddNote = () => {
    if (!leadId || !noteInput.trim()) return;
    addActivity.mutate({ id: leadId, data: { action: noteInput.trim() } }, {
      onSuccess: () => {
        setNoteInput("");
        invalidateLeadQueries();
      },
    });
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-[540px] p-0 flex flex-col">
        {isLoading || !lead ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : (
          <>
            <SheetHeader className="px-6 py-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <SheetTitle className="text-xl">{lead.name}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {lead.serviceInterest || "General Inquiry"} · {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <LeadBadge status={lead.status} />
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-4 space-y-6">
                {/* Contact info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                  <div className="space-y-1.5">
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.source && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="h-4 w-4 shrink-0" />
                        Source: {lead.source}
                      </div>
                    )}
                    {lead.clientName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-slate-500">Client:</span> {lead.clientName}
                      </div>
                    )}
                  </div>
                  {lead.message && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-md text-sm text-slate-600 border">
                      {lead.message}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Status pipeline */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Stage</h3>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={lead.status === s ? "default" : "outline"}
                        onClick={() => handleStatusChange(s)}
                        disabled={updateLead.isPending}
                        className="h-7 text-xs"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkContacted}
                    disabled={updateLead.isPending}
                    className="h-7 text-xs"
                  >
                    <Phone className="h-3 w-3 mr-1.5" /> Mark Contacted Now
                  </Button>
                  {lead.lastContactedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last contacted: {format(new Date(lead.lastContactedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Value + Notes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal Info</h3>
                  <div>
                    <Label className="text-xs mb-1 block">Estimated Value ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0"
                        value={estimatedValue}
                        onChange={(e) => { setEstimatedValue(e.target.value); setIsDirty(true); }}
                        className="pl-7 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Notes</Label>
                    <Textarea
                      placeholder="Add notes about this lead..."
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  {isDirty && (
                    <Button size="sm" onClick={handleSaveNotes} disabled={updateLead.isPending} className="h-7">
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Save Changes
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Activity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Log a note or action..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="text-sm h-8"
                      onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    />
                    <Button size="sm" onClick={handleAddNote} disabled={!noteInput.trim() || addActivity.isPending} className="h-8 shrink-0">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ActivityTimeline entries={activity ?? []} isLoading={activityLoading} />
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
