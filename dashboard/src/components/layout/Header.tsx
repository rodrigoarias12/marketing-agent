import { RefreshCw } from "lucide-react";
import type { View } from "../../types";

const TITLES: Record<View, string> = {
  home: "Mission Control",
  content: "Content Dashboard",
  prospects: "Prospects",
  research: "Research",
  agents: "Agent Squad",
  chat: "Eddie Chat",
};

interface HeaderProps {
  view: View;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

export function Header({ view, onRefresh, children }: HeaderProps) {
  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-outline bg-surface">
      <h2 className="title-lg text-el-high">{TITLES[view]}</h2>
      <div className="flex items-center gap-3">
        {children}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-el-low hover:text-el-high hover:bg-overlay transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
