import { formatDistanceToNow } from "date-fns";
import { ActivityLogEntry } from "@workspace/api-client-react";
import { Activity, PhoneCall, TrendingUp, Edit, PlusCircle } from "lucide-react";

function getActionIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes("captured") || a.includes("form")) return <PlusCircle className="h-3.5 w-3.5 text-blue-400" />;
  if (a.includes("contacted") || a.includes("contact")) return <PhoneCall className="h-3.5 w-3.5 text-amber-400" />;
  if (a.includes("status")) return <TrendingUp className="h-3.5 w-3.5 text-purple-400" />;
  if (a.includes("note")) return <Edit className="h-3.5 w-3.5 text-slate-400" />;
  return <Activity className="h-3.5 w-3.5 text-slate-500" />;
}

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  isLoading?: boolean;
}

export function ActivityTimeline({ entries, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return <div className="text-sm text-slate-500 py-4">Loading activity...</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-600">
        <Activity className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 py-2">
          <div className="flex flex-col items-center shrink-0">
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full mt-0.5"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {getActionIcon(entry.action)}
            </div>
            {i < entries.length - 1 && (
              <div className="w-px flex-1 mt-1 min-h-[8px]" style={{ background: "rgba(255,255,255,0.07)" }} />
            )}
          </div>
          <div className="flex-1 pb-2 min-w-0">
            <p className="text-sm text-slate-300 leading-snug">{entry.action}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {entry.userName && <span className="font-medium text-slate-500">{entry.userName} · </span>}
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
