import { formatDistanceToNow } from "date-fns";
import { ActivityLogEntry } from "@workspace/api-client-react";
import { Activity, PhoneCall, TrendingUp, Edit, Zap, PlusCircle } from "lucide-react";

function getActionIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes("captured") || a.includes("form")) return <PlusCircle className="h-3.5 w-3.5 text-blue-500" />;
  if (a.includes("contacted") || a.includes("contact")) return <PhoneCall className="h-3.5 w-3.5 text-amber-500" />;
  if (a.includes("status")) return <TrendingUp className="h-3.5 w-3.5 text-purple-500" />;
  if (a.includes("note")) return <Edit className="h-3.5 w-3.5 text-slate-500" />;
  return <Activity className="h-3.5 w-3.5 text-slate-400" />;
}

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  isLoading?: boolean;
}

export function ActivityTimeline({ entries, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4">Loading activity...</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 py-2">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 shrink-0 mt-0.5">
              {getActionIcon(entry.action)}
            </div>
            {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1 mb-0 min-h-[8px]" />}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-sm text-slate-700 leading-snug">{entry.action}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entry.userName && <span className="font-medium">{entry.userName} · </span>}
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
