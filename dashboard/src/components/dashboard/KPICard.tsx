import type { ReactNode } from "react";

interface KPICardProps {
  icon: ReactNode;
  label: string;
  value: number;
  detail?: string;
  accent?: boolean;
}

export function KPICard({ icon, label, value, detail, accent }: KPICardProps) {
  return (
    <div className={`bg-surface border rounded-xl p-5 shadow-low ${
      accent ? "border-green-darker/30 ring-1 ring-green-lighter/40" : "border-outline"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          accent ? "bg-green-lighter-ext text-green-darker-ext" : "bg-overlay text-el-mid"
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="amount-md text-el-high">{value}</div>
          <div className="label-lg text-el-low">{label}</div>
        </div>
      </div>
      {detail && (
        <p className="label-md text-el-low mt-2 pt-2 border-t border-outline">{detail}</p>
      )}
    </div>
  );
}
