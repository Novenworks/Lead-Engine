import { useState, useEffect } from "react";
import { useGetLead, useUpdateLead, useGetLeadActivity, useCreateLeadActivity, getListLeadsQueryKey, getGetLeadQueryKey, getGetLeadActivityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActivityTimeline } from "./ActivityTimeline";
import { LeadBadge } from "./LeadBadge";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Tag, DollarSign, Repeat2, RefreshCw, Send, Building2, CheckCircle2, Calendar } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["New", "Contacted", "Booked", "Won", "Lost"] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLES: Record<Status, string> = {
  New: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  Contacted: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  Booked: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  Won: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  Lost: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100",
};

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
        toast({ title: "Changes saved" });
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
      <SheetContent side="right" className="w-full sm:w-[520px] sm:max-w-[520px] p-0 flex flex-col">
        {isLoading || !lead ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b shrink-0 bg-slate-50/80">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl truncate">{lead.name}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {lead.serviceInterest || "General Inquiry"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <LeadBadge status={lead.status} />
                    {lead.clientName && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 className="h-3 w-3" />
                        {lead.clientName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-5 space-y-5">

                {/* Contact section */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Contact</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex-1 flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium text-slate-700 border border-slate-200 hover:border-blue-200"
                      >
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </a>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex-1 flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium text-slate-700 border border-slate-200 hover:border-blue-200"
                        >
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </a>
                      </div>
                    )}
                    {lead.source && (
                      <div className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-slate-500">
                        <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{lead.source}</span>
                      </div>
                    )}
                    {lead.message && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-200 leading-relaxed">
                        "{lead.message}"
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Opportunity section */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Opportunity</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Estimated Value
                      </div>
                      <div className="text-lg font-bold text-emerald-700">
                        {lead.estimatedValue != null ? `$${lead.estimatedValue.toLocaleString()}` : "—"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium mb-1">
                        <Repeat2 className="h-3.5 w-3.5" />
                        Monthly Recurring
                      </div>
                      <div className="text-lg font-bold text-purple-700">
                        {lead.monthlyRecurringValue != null ? `$${lead.monthlyRecurringValue.toLocaleString()}/mo` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 px-0.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Lead created {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    {lead.lastContactedAt && (
                      <span className="ml-2">· Last contacted {format(new Date(lead.lastContactedAt), "MMM d")}</span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Workflow section */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Pipeline Stage</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={updateLead.isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          lead.status === s
                            ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current/30"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        }`}
                      >
                        {lead.status === s && <span className="mr-1">✓</span>}
                        {s}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkContacted}
                    disabled={updateLead.isPending}
                    className="h-8 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Contacted Now
                  </Button>
                </div>

                <Separator />

                {/* Notes + Value edit */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Deal Info</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-600 mb-1.5 block">Estimated Value ($)</Label>
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
                      <Label className="text-xs text-slate-600 mb-1.5 block">Notes</Label>
                      <Textarea
                        placeholder="Add notes about this lead..."
                        value={notes}
                        onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                    {isDirty && (
                      <Button size="sm" onClick={handleSaveNotes} disabled={updateLead.isPending} className="h-8 gap-1.5">
                        <RefreshCw className="h-3 w-3" />
                        Save Changes
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Activity log */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Activity</h3>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Log a note or action..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="text-sm h-8"
                      onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!noteInput.trim() || addActivity.isPending}
                      className="h-8 shrink-0"
                    >
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
