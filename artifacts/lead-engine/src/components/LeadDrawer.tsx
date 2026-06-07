import { useState, useEffect } from "react";
import { useGetLead, useUpdateLead, useGetLeadActivity, useCreateLeadActivity, getListLeadsQueryKey, getGetLeadQueryKey, getGetLeadActivityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const STATUS_ACTIVE: Record<Status, { bg: string; color: string; border: string }> = {
  New: { bg: "rgba(37,99,235,0.2)", color: "#60a5fa", border: "rgba(37,99,235,0.45)" },
  Contacted: { bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "rgba(245,158,11,0.45)" },
  Booked: { bg: "rgba(168,85,247,0.2)", color: "#c084fc", border: "rgba(168,85,247,0.45)" },
  Won: { bg: "rgba(34,197,94,0.2)", color: "#4ade80", border: "rgba(34,197,94,0.45)" },
  Lost: { bg: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "rgba(100,116,139,0.4)" },
};

interface LeadDrawerProps {
  leadId: number | null;
  onClose: () => void;
}

const divider = { borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "20px", paddingTop: "20px" };
const sectionLabel = "text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 block";
const glassCard = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
const contactBtn = "flex-1 flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-medium text-slate-300 transition-all";

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
      onSuccess: () => { invalidateLeadQueries(); toast({ title: `Status → ${status}` }); },
    });
  };

  const handleSaveNotes = () => {
    if (!leadId) return;
    updateLead.mutate({ id: leadId, data: { notes, estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null } }, {
      onSuccess: () => { setIsDirty(false); invalidateLeadQueries(); toast({ title: "Changes saved" }); },
    });
  };

  const handleMarkContacted = () => {
    if (!leadId) return;
    updateLead.mutate({
      id: leadId,
      data: { lastContactedAt: new Date().toISOString(), status: lead?.status === "New" ? "Contacted" : lead?.status }
    }, {
      onSuccess: () => { invalidateLeadQueries(); toast({ title: "Marked as contacted" }); },
    });
  };

  const handleAddNote = () => {
    if (!leadId || !noteInput.trim()) return;
    addActivity.mutate({ id: leadId, data: { action: noteInput.trim() } }, {
      onSuccess: () => { setNoteInput(""); invalidateLeadQueries(); },
    });
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] sm:max-w-[520px] p-0 flex flex-col"
        style={{ background: "#0d1628", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        {isLoading || !lead ? (
          <div className="flex items-center justify-center h-full text-slate-600">Loading...</div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader
              className="px-6 py-5 shrink-0"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl text-white truncate">{lead.name}</SheetTitle>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    {lead.serviceInterest || "General Inquiry"}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <LeadBadge status={lead.status} />
                    {lead.clientName && (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Building2 className="h-3 w-3" />
                        {lead.clientName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-5 space-y-0">

                {/* Contact */}
                <div>
                  <span className={sectionLabel}>Contact</span>
                  <div className="space-y-1.5">
                    <a
                      href={`mailto:${lead.email}`}
                      className={contactBtn}
                      style={glassCard}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.12)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    >
                      <Mail className="h-4 w-4 text-slate-600 shrink-0" />
                      <span className="truncate text-slate-300">{lead.email}</span>
                    </a>
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className={contactBtn}
                        style={glassCard}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.12)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                      >
                        <Phone className="h-4 w-4 text-slate-600 shrink-0" />
                        <span className="text-slate-300">{lead.phone}</span>
                      </a>
                    )}
                    {lead.source && (
                      <div className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-slate-600">
                        <Tag className="h-3.5 w-3.5 shrink-0" />
                        <span>{lead.source}</span>
                      </div>
                    )}
                    {lead.message && (
                      <div
                        className="mt-2 p-3 rounded-xl text-sm text-slate-400 leading-relaxed italic"
                        style={glassCard}
                      >
                        "{lead.message}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Opportunity */}
                <div style={divider}>
                  <span className={sectionLabel}>Opportunity</span>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3.5 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "#4ade80" }}>
                        <DollarSign className="h-3.5 w-3.5" /> Estimated Value
                      </div>
                      <div className="text-xl font-bold text-white">
                        {lead.estimatedValue != null ? `$${lead.estimatedValue.toLocaleString()}` : "—"}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "#c084fc" }}>
                        <Repeat2 className="h-3.5 w-3.5" /> Monthly Recurring
                      </div>
                      <div className="text-xl font-bold text-white">
                        {lead.monthlyRecurringValue != null ? `$${lead.monthlyRecurringValue.toLocaleString()}/mo` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-0.5 text-xs text-slate-700">
                    <Calendar className="h-3 w-3" />
                    Created {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    {lead.lastContactedAt && (
                      <span className="ml-2">· Last contact {format(new Date(lead.lastContactedAt), "MMM d")}</span>
                    )}
                  </div>
                </div>

                {/* Pipeline Stage */}
                <div style={divider}>
                  <span className={sectionLabel}>Pipeline Stage</span>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {STATUSES.map((s) => {
                      const isActive = lead.status === s;
                      const style = STATUS_ACTIVE[s];
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          disabled={updateLead.isPending}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={isActive ? {
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            boxShadow: `0 0 12px ${style.bg}`,
                          } : {
                            background: "rgba(255,255,255,0.04)",
                            color: "#475569",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                        >
                          {isActive && <span className="mr-1">✓</span>}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleMarkContacted}
                    disabled={updateLead.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.25)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.15)"; }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Contacted Now
                  </button>
                </div>

                {/* Deal info */}
                <div style={divider}>
                  <span className={sectionLabel}>Deal Info</span>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5 block">
                        Estimated Value ($)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-600" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={estimatedValue}
                          onChange={(e) => { setEstimatedValue(e.target.value); setIsDirty(true); }}
                          className="pl-7 h-9 text-sm bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-700 focus-visible:border-blue-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5 block">
                        Notes
                      </Label>
                      <Textarea
                        placeholder="Add notes about this lead..."
                        value={notes}
                        onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
                        rows={3}
                        className="text-sm resize-none bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-700 focus-visible:border-blue-500/50"
                      />
                    </div>
                    {isDirty && (
                      <button
                        onClick={handleSaveNotes}
                        disabled={updateLead.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all text-white"
                        style={{ background: "#2563EB" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Save Changes
                      </button>
                    )}
                  </div>
                </div>

                {/* Activity */}
                <div style={divider}>
                  <span className={sectionLabel}>Activity</span>
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Log a note or action…"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="text-sm h-9 bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-700 focus-visible:border-blue-500/50"
                      onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!noteInput.trim() || addActivity.isPending}
                      className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all text-white disabled:opacity-40"
                      style={{ background: "#2563EB" }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ActivityTimeline entries={activity ?? []} isLoading={activityLoading} />
                </div>

                <div className="h-4" />
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
