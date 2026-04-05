import { AlertTriangle, Send, Users, XCircle } from "lucide-react";
import type { PendingAction, View } from "../../types";

const ICONS: Record<string, typeof AlertTriangle> = {
  prospect_followup: Users,
  content_publish: Send,
  content_failed: XCircle,
};

interface PendingActionsProps {
  actions: PendingAction[];
  onNavigate: (view: View) => void;
}

export function PendingActions({ actions, onNavigate }: PendingActionsProps) {
  if (actions.length === 0) {
    return (
      <div className="bg-violet-lighter-ext/30 border border-violet-lighter rounded-xl p-5 text-center">
        <p className="body-sm-w-md text-violet-darker-ext">Todo al día — no hay acciones pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const Icon = ICONS[action.type] ?? AlertTriangle;
        return (
          <button
            key={action.type}
            onClick={() => onNavigate(action.navigateTo)}
            className="w-full flex items-center gap-3 bg-warning-lighter/20 border border-warning-base/30 rounded-xl px-5 py-3.5 hover:bg-warning-lighter/40 transition cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-warning-lighter flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-warning-darker" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="body-sm-w-md text-el-high">{action.description}</p>
            </div>
            <span className="amount-sm text-warning-darker shrink-0">{action.count}</span>
          </button>
        );
      })}
    </div>
  );
}
