import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@workspace/api-client-react";

export function LeadBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    [LeadStatus.New]: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
    [LeadStatus.Contacted]: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200",
    [LeadStatus.Booked]: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200",
    [LeadStatus.Won]: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
    [LeadStatus.Lost]: "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200",
  };

  const className = statusColors[status] || "bg-slate-100 text-slate-800";

  return (
    <Badge variant="outline" className={`${className} font-medium tracking-wide uppercase text-[10px]`}>
      {status}
    </Badge>
  );
}
