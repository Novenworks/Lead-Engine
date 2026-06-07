import { useState } from "react";
import { useListLeads, useGetMe } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { LeadBadge } from "@/components/LeadBadge";
import { LeadDrawer } from "@/components/LeadDrawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["New", "Contacted", "Booked", "Won", "Lost"];

export default function Leads() {
  const { data: user } = useGetMe();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const queryParams: Record<string, string | number> = {};
  if (search) queryParams.search = search;
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (sourceFilter) queryParams.source = sourceFilter;

  const { data: leads, isLoading } = useListLeads(queryParams);

  const hasFilters = statusFilter !== "all" || !!sourceFilter || !!search;

  const clearFilters = () => {
    setStatusFilter("all");
    setSourceFilter("");
    setSearch("");
  };

  // Gather unique sources from current results for filter suggestions
  const sources = Array.from(new Set(leads?.map((l) => l.source).filter(Boolean) as string[])).slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "Loading..." : `${leads?.length ?? 0} leads`}
            {hasFilters && " (filtered)"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-3 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter || "all"} onValueChange={(v) => setSourceFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[150px] h-8 text-sm">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 shrink-0">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading leads...</div>
        ) : leads && leads.length > 0 ? (
          leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className="w-full text-left bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all active:bg-slate-50"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.serviceInterest || "General Inquiry"}</p>
                </div>
                <LeadBadge status={lead.status} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{lead.email}</span>
                {lead.estimatedValue != null && (
                  <span className="flex items-center gap-0.5 text-green-600 font-medium">
                    <DollarSign className="h-3 w-3" />{lead.estimatedValue.toLocaleString()}
                  </span>
                )}
                <span className="ml-auto">{format(new Date(lead.createdAt), "MMM d")}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">No leads found.</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Service</TableHead>
              {user?.role === "admin" && <TableHead>Client</TableHead>}
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading leads...</TableCell>
              </TableRow>
            ) : leads && leads.length > 0 ? (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="hover:bg-slate-50/70 cursor-pointer"
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{lead.email}</span>
                      <span className="text-xs text-muted-foreground">{lead.phone || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{lead.serviceInterest || "—"}</TableCell>
                  {user?.role === "admin" && (
                    <TableCell className="text-sm text-slate-500">{lead.clientName || "—"}</TableCell>
                  )}
                  <TableCell className="text-sm">
                    {lead.estimatedValue != null ? (
                      <span className="text-green-600 font-medium">${lead.estimatedValue.toLocaleString()}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell><LeadBadge status={lead.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found matching your criteria.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
