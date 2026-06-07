import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@workspace/api-client-react";

export function LeadBadge({ status }: { status: string }) {
  const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
    [LeadStatus.New]: { bg: "rgba(37,99,235,0.18)", color: "#60a5fa", border: "rgba(37,99,235,0.35)" },
    [LeadStatus.Contacted]: { bg: "rgba(245,158,11,0.18)", color: "#fbbf24", border: "rgba(245,158,11,0.35)" },
    [LeadStatus.Booked]: { bg: "rgba(168,85,247,0.18)", color: "#c084fc", border: "rgba(168,85,247,0.35)" },
    [LeadStatus.Won]: { bg: "rgba(34,197,94,0.18)", color: "#4ade80", border: "rgba(34,197,94,0.35)" },
    [LeadStatus.Lost]: { bg: "rgba(100,116,139,0.18)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" },
  };

  const s = statusStyles[status] ?? statusStyles[LeadStatus.Lost];

  return (
    <Badge
      variant="outline"
      className="font-semibold tracking-wider uppercase text-[10px] border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {status}
    </Badge>
  );
}
