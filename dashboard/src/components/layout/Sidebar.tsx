import { LayoutDashboard, FileText, Users, Search, Zap, MessageCircle, Bot } from "lucide-react";
import type { View } from "../../types";

const NAV_ITEMS: { view: View; icon: typeof FileText; label: string }[] = [
  { view: "home", icon: LayoutDashboard, label: "Mission Control" },
  { view: "content", icon: FileText, label: "Content" },
  { view: "prospects", icon: Users, label: "Prospects" },
  { view: "research", icon: Search, label: "Research" },
  { view: "agents", icon: Bot, label: "Agents" },
  { view: "chat", icon: MessageCircle, label: "Eddie Chat" },
];

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 min-h-screen bg-surface border-r border-outline flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-outline">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-lighter-ext flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-darker-ext" />
          </div>
          <div>
            <h1 className="title-md text-el-high leading-tight">Eddie</h1>
            <p className="label-lg text-el-low">Mission Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg body-sm-w-md transition-all duration-200 cursor-pointer
                ${active
                  ? "bg-green-lighter-ext text-green-darker-ext"
                  : "text-el-mid hover:bg-overlay hover:text-el-high"
                }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-outline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success-base animate-pulse" />
          <span className="label-lg text-el-low">Eddie AI</span>
        </div>
      </div>
    </aside>
  );
}
