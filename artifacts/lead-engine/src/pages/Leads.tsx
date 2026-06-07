import { useState, useEffect } from "react";
import { useListLeads, useGetMe } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { LeadBadge } from "@/components/LeadBadge";
import { LeadDrawer } from "@/components/LeadDrawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, X, Phone, Mail, MessageSquare, Users } from "lucide-react";

const STATUSES = ["New", "Contacted", "Booked", "Won", "Lost"];

const glass = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const PAGE_SIZE = 25;

export default function Leads() {
  const { data: user } = useGetMe();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sourceFilter]);

  const queryParams: Record<string, string | number> = {};
  if (search) queryParams.search = search;
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (sourceFilter) queryParams.source = sourceFilter;

  const { data: leads, isLoading } = useListLeads(queryParams);

  const totalLeads = leads?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));
  const paginatedLeads = leads?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? [];

  const hasFilters = statusFilter !== "all" || !!sourceFilter || !!search;

  const clearFilters = () => {
    setStatusFilter("all");
    setSourceFilter("");
    setSearch("");
  };

  const sources = Array.from(new Set(leads?.map((l) => l.source).filter(Boolean) as string[])).slice(0, 8);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="h-4 w-4 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Leads</h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage every opportunity before it slips away ·{" "}
            <span className="text-slate-600">
              {isLoading
            ? "Loading…"
            : `${totalLeads} lead${totalLeads !== 1 ? "s" : ""}${hasFilters ? " (filtered)" : ""}`}
            </span>
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 rounded-xl"
        style={glass}
      >
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-white/[0.04] border-white/10 text-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter || "all"} onValueChange={(v) => setSourceFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm bg-white/[0.04] border-white/10 text-slate-300">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 shrink-0 text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Loading leads...</div>
        ) : paginatedLeads.length > 0 ? (
          paginatedLeads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl p-4 hover:bg-white/[0.05] transition-colors"
              style={glass}
            >
              <button className="w-full text-left" onClick={() => setSelectedLeadId(lead.id)}>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <div>
                    <p className="font-semibold text-white">{lead.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.serviceInterest || "General Inquiry"}</p>
                  </div>
                  <LeadBadge status={lead.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                  <span className="truncate">{lead.email}</span>
                  {lead.estimatedValue != null && (
                    <span className="flex items-center gap-0.5 font-bold shrink-0" style={{ color: "#4ade80" }}>
                      <DollarSign className="h-3 w-3" />{lead.estimatedValue.toLocaleString()}
                    </span>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 transition-colors hover:text-blue-400"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 transition-colors hover:text-blue-400"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 transition-colors hover:text-blue-400"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Notes
                </button>
                <span className="ml-auto text-xs text-slate-700">{format(new Date(lead.createdAt), "MMM d")}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-600 text-sm">No leads found.</div>
        )}
      </div>

      {/* Desktop table */}
      <div
        className="hidden sm:block rounded-xl overflow-hidden"
        style={glass}
      >
        <Table>
          <TableHeader>
            <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <TableHead className="pl-5 text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Name</TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Contact</TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Service</TableHead>
              {user?.role === "admin" && <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Workspace</TableHead>}
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Value</TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Status</TableHead>
              <TableHead className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Date</TableHead>
              <TableHead className="text-right pr-5 text-slate-600 font-semibold text-[11px] uppercase tracking-wider bg-transparent">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-600 bg-transparent">Loading leads...</TableCell>
              </TableRow>
            ) : paginatedLeads.length > 0 ? (
              paginatedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer group transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <TableCell className="font-semibold pl-5 py-3.5 text-slate-100 bg-transparent">{lead.name}</TableCell>
                  <TableCell className="py-3.5 bg-transparent">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-300">{lead.email}</span>
                      {lead.phone && <span className="text-xs text-slate-600">{lead.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 py-3.5 bg-transparent">{lead.serviceInterest || "—"}</TableCell>
                  {user?.role === "admin" && (
                    <TableCell className="text-sm text-slate-600 py-3.5 bg-transparent">{lead.clientName || "—"}</TableCell>
                  )}
                  <TableCell className="py-3.5 bg-transparent">
                    {lead.estimatedValue != null ? (
                      <span className="font-bold text-sm" style={{ color: "#4ade80" }}>
                        ${lead.estimatedValue.toLocaleString()}
                      </span>
                    ) : <span className="text-slate-700">—</span>}
                    {lead.monthlyRecurringValue != null && (
                      <div className="text-xs font-medium" style={{ color: "#c084fc" }}>
                        ${lead.monthlyRecurringValue.toLocaleString()}/mo
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 bg-transparent"><LeadBadge status={lead.status} /></TableCell>
                  <TableCell className="text-sm text-slate-600 py-3.5 bg-transparent">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right pr-5 py-3.5 bg-transparent">
                    <div
                      className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                          title="Call">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <a href={`mailto:${lead.email}`}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                        title="Email">
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                      <button
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                        title="Notes"
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-600 bg-transparent">
                  No leads found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-600">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalLeads)} of {totalLeads}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-700">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className="w-7 h-7 rounded-lg text-xs font-bold transition-colors"
                    style={
                      page === p
                        ? { background: "#2563EB", color: "#fff" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }
                    }
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
