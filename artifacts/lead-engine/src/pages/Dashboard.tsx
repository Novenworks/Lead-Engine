import { useGetDashboardStats, useGetRecentLeads, useGetFollowUpLeads, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { LeadBadge } from "@/components/LeadBadge";
import { LeadDrawer } from "@/components/LeadDrawer";
import { useState } from "react";
import {
  Users, TrendingUp, DollarSign, Repeat2, AlertCircle, Trophy,
  Phone, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = {
  New: "#3b82f6",
  Contacted: "#f59e0b",
  Booked: "#a855f7",
  Won: "#22c55e",
  Lost: "#ef4444",
};

function currency(v: number | undefined) {
  if (!v) return "$0";
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentLeads, isLoading: leadsLoading } = useGetRecentLeads({ limit: 8 });
  const { data: followUps, isLoading: followUpsLoading } = useGetFollowUpLeads({ limit: 5 });
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const statItems = [
    { title: "Total Leads", value: stats?.total ?? 0, icon: Users, color: "text-slate-600", bg: "bg-slate-100", format: (v: number) => String(v) },
    { title: "Pipeline Value", value: stats?.pipelineValue ?? 0, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", format: currency },
    { title: "Won Revenue", value: stats?.wonRevenue ?? 0, icon: DollarSign, color: "text-green-600", bg: "bg-green-50", format: currency },
    { title: "MRR", value: stats?.mrr ?? 0, icon: Repeat2, color: "text-purple-600", bg: "bg-purple-50", format: currency },
    { title: "Follow-ups Due", value: stats?.followUpCount ?? 0, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", format: (v: number) => String(v) },
    { title: "Won Leads", value: stats?.won ?? 0, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50", format: (v: number) => String(v) },
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

  // Source distribution from recent leads
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
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {user?.role === "admin" ? "All clients" : user?.clientName} · {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statItems.map((item) => (
          <Card key={item.title} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="text-xl font-bold tracking-tight">
                {statsLoading ? <span className="animate-pulse text-slate-300">...</span> : item.format(item.value)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      {!statsLoading && statusData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Status donut */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lead Status</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Leads"]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Source bar */}
          {sourceData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={sourceData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value: number) => [value, "Leads"]} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bottom row: Follow-ups + Recent */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Follow-up widget */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Needs Follow-Up</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {followUpsLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : followUps && followUps.length > 0 ? (
              <div className="space-y-2">
                {followUps.map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.status} · {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LeadBadge status={lead.status} />
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">All leads are up to date! 🎉</div>
            )}
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {leadsLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-1">
                {recentLeads.slice(0, 6).map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.serviceInterest || "General"} · {format(new Date(lead.createdAt), "MMM d")}
                      </p>
                    </div>
                    <LeadBadge status={lead.status} />
                  </button>
                ))}
                <div className="pt-2">
                  <Link href="/leads">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-7">View all leads</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">No leads yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
