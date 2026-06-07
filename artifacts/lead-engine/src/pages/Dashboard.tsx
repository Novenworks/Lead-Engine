import { useGetDashboardStats, useGetRecentLeads, useGetFollowUpLeads, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { LeadBadge } from "@/components/LeadBadge";
import { LeadDrawer } from "@/components/LeadDrawer";
import { useState } from "react";
import {
  Users, TrendingUp, DollarSign, Repeat2, AlertCircle, Trophy, ChevronRight, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  New: "#2563EB",
  Contacted: "#f59e0b",
  Booked: "#a855f7",
  Won: "#22c55e",
  Lost: "#475569",
};

function currency(v: number | undefined) {
  if (!v) return "$0";
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "#e2e8f0",
    fontSize: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  labelStyle: { color: "#94a3b8" },
};

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentLeads, isLoading: leadsLoading } = useGetRecentLeads({ limit: 50 });
  const { data: followUps, isLoading: followUpsLoading } = useGetFollowUpLeads({ limit: 5 });
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const followUpCount = stats?.followUpCount ?? 0;

  const statItems = [
    {
      title: "Total Leads",
      value: stats?.total ?? 0,
      icon: Users,
      color: "#60a5fa",
      bg: "rgba(37,99,235,0.15)",
      glow: "rgba(37,99,235,0.08)",
      format: (v: number) => String(v),
    },
    {
      title: "Pipeline Value",
      value: stats?.pipelineValue ?? 0,
      icon: TrendingUp,
      color: "#34d399",
      bg: "rgba(16,185,129,0.15)",
      glow: "rgba(16,185,129,0.06)",
      format: currency,
    },
    {
      title: "Won Revenue",
      value: stats?.wonRevenue ?? 0,
      icon: DollarSign,
      color: "#4ade80",
      bg: "rgba(34,197,94,0.15)",
      glow: "rgba(34,197,94,0.06)",
      format: currency,
    },
    {
      title: "MRR",
      value: stats?.mrr ?? 0,
      icon: Repeat2,
      color: "#c084fc",
      bg: "rgba(168,85,247,0.15)",
      glow: "rgba(168,85,247,0.06)",
      format: currency,
    },
    {
      title: "Follow-ups Due",
      value: followUpCount,
      icon: AlertCircle,
      color: followUpCount > 0 ? "#fb923c" : "#fbbf24",
      bg: followUpCount > 0 ? "rgba(249,115,22,0.18)" : "rgba(245,158,11,0.12)",
      glow: followUpCount > 0 ? "rgba(249,115,22,0.06)" : "transparent",
      format: (v: number) => String(v),
    },
    {
      title: "Won Leads",
      value: stats?.won ?? 0,
      icon: Trophy,
      color: "#4ade80",
      bg: "rgba(34,197,94,0.15)",
      glow: "rgba(34,197,94,0.05)",
      format: (v: number) => String(v),
    },
  ];

  const statusData = stats
    ? [
        { name: "New", value: stats.new },
        { name: "Contacted", value: stats.contacted },
        { name: "Booked", value: stats.booked },
        { name: "Won", value: stats.won },
        { name: "Lost", value: stats.lost },
      ].filter((d) => d.value > 0)
    : [];

  const sourceMap: Record<string, number> = {};
  recentLeads?.forEach((l) => {
    const src = l.source || "Direct";
    sourceMap[src] = (sourceMap[src] ?? 0) + 1;
  });
  const sourceData = Object.entries(sourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Growth Overview</h1>
          </div>
          <p className="text-sm text-slate-500">
            Track leads, follow-ups, and revenue across your workspaces ·{" "}
            <span className="text-slate-600">{format(new Date(), "MMMM d, yyyy")}</span>
          </p>
          {user?.role !== "admin" && user?.clientName && (
            <p className="text-xs text-blue-400/70 mt-0.5 font-medium">{user.clientName}</p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statItems.map((item, i) => (
          <div
            key={item.title}
            className="rounded-xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, ${item.glow} 100%)`,
              border: "1px solid rgba(255,255,255,0.08)",
              animationDelay: `${i * 60}ms`,
              animationFillMode: "both",
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 shrink-0"
              style={{ background: item.bg }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div className="text-[1.55rem] font-bold tracking-tight leading-none" style={{ color: item.color }}>
              {statsLoading
                ? <span className="animate-pulse text-slate-700">…</span>
                : item.format(item.value)}
            </div>
            <div className="text-[11px] text-slate-600 mt-1.5 font-medium">{item.title}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!statsLoading && statusData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="px-5 pt-4 pb-1">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Lead Status</p>
            </div>
            <div className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] ?? "#475569"} />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [v, "Leads"]} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ color: "#64748b", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {sourceData.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="px-5 pt-4 pb-1">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Lead Sources</p>
              </div>
              <div className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={sourceData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [v, "Leads"]} />
                    <Bar dataKey="value" fill="#2563EB" radius={[0, 5, 5, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Follow-ups + Recent leads */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Follow-up queue */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: followUpCount > 0
              ? "1px solid rgba(249,115,22,0.25)"
              : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="px-5 pt-4 pb-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Needs Follow-Up</p>
            <AlertCircle className={cn("h-3.5 w-3.5", followUpCount > 0 ? "text-orange-500" : "text-slate-700")} />
          </div>
          <div className="p-3">
            {followUpsLoading ? (
              <div className="text-sm text-slate-600 py-3 px-2">Loading...</div>
            ) : followUps && followUps.length > 0 ? (
              <div className="space-y-0.5">
                {followUps.map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-all group"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{lead.name}</p>
                      <p className="text-xs text-slate-600 truncate">
                        {lead.status} · {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <LeadBadge status={lead.status} />
                      <ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-600">All leads are up to date 🎉</div>
            )}
          </div>
        </div>

        {/* Recent leads */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Recent Leads</p>
          </div>
          <div className="p-3">
            {leadsLoading ? (
              <div className="text-sm text-slate-600 py-3 px-2">Loading...</div>
            ) : recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-0.5">
                {recentLeads.slice(0, 6).map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-all group"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{lead.name}</p>
                      <p className="text-xs text-slate-600 truncate">
                        {lead.serviceInterest || "General"} · {format(new Date(lead.createdAt), "MMM d")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.estimatedValue != null && (
                        <span className="text-xs font-bold" style={{ color: "#4ade80" }}>
                          ${lead.estimatedValue.toLocaleString()}
                        </span>
                      )}
                      <LeadBadge status={lead.status} />
                    </div>
                  </button>
                ))}
                <div className="pt-1 px-1">
                  <Link href="/leads">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs h-8 text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]"
                    >
                      View all leads →
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-600">No leads yet.</div>
            )}
          </div>
        </div>
      </div>

      <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
