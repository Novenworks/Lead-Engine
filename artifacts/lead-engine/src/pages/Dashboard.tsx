import { useGetDashboardStats, useGetRecentLeads, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { format } from "date-fns";
import { Users, UserPlus, PhoneForwarded, CalendarCheck, Trophy, XCircle } from "lucide-react";
import { LeadBadge } from "@/components/LeadBadge";

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentLeads, isLoading: leadsLoading } = useGetRecentLeads({ limit: 5 });

  const statItems = [
    { title: "Total Leads", value: stats?.total || 0, icon: Users, color: "text-slate-600" },
    { title: "New", value: stats?.new || 0, icon: UserPlus, color: "text-blue-500" },
    { title: "Contacted", value: stats?.contacted || 0, icon: PhoneForwarded, color: "text-amber-500" },
    { title: "Booked", value: stats?.booked || 0, icon: CalendarCheck, color: "text-purple-500" },
    { title: "Won", value: stats?.won || 0, icon: Trophy, color: "text-green-500" },
    { title: "Lost", value: stats?.lost || 0, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your leads today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="col-span-4 border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="text-sm text-muted-foreground">Loading recent leads...</div>
          ) : recentLeads && recentLeads.length > 0 ? (
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline text-slate-900">
                        {lead.name}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {lead.serviceInterest || "General Inquiry"} • {format(new Date(lead.createdAt), "MMM d, h:mm a")}
                      </p>
                      {user?.role === "admin" && lead.clientName && (
                         <p className="text-xs text-slate-400 mt-1">Client: {lead.clientName}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <LeadBadge status={lead.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">No recent leads found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
