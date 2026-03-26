import { Users, FileText, Search, Send, Check, Pencil, Plus } from "lucide-react";
import type { ActivityLogEntry } from "../../types";

const TYPE_CONFIG: Record<string, { icon: typeof Users; color: string }> = {
  create: { icon: Plus, color: "text-success-base" },
  update: { icon: Pencil, color: "text-el-mid" },
  followup: { icon: Send, color: "text-green-darker-ext" },
  approve: { icon: Check, color: "text-warning-base" },
  publish: { icon: Send, color: "text-success-base" },
};

const ENTITY_ICONS: Record<string, typeof Users> = {
  prospect: Users,
  content: FileText,
  research: Search,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-el-low body-sm">
        Sin actividad reciente
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const typeConf = TYPE_CONFIG[entry.type] ?? { icon: Pencil, color: "text-el-low" };
        const EntityIcon = ENTITY_ICONS[entry.entityType] ?? FileText;
        const TypeIcon = typeConf.icon;

        return (
          <div key={entry.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-overlay transition">
            <div className="w-8 h-8 rounded-lg bg-overlay flex items-center justify-center shrink-0 mt-0.5">
              <EntityIcon className="w-4 h-4 text-el-mid" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="body-sm text-el-high">{entry.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <TypeIcon className={`w-3 h-3 ${typeConf.color}`} />
                <span className="label-md text-el-low">{timeAgo(entry.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
