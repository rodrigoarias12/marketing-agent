import { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { HomeView } from "./components/dashboard/HomeView";
import { ContentDashboard } from "./components/content/ContentDashboard";
import { ProspectsView } from "./components/prospects/ProspectsView";
import { ResearchView } from "./components/research/ResearchView";
import { ChatView } from "./components/chat/ChatView";
import { AgentsView } from "./components/agents/AgentsView";
import type { View } from "./types";

export function App() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar currentView={view} onNavigate={setView} />
      <main className="flex-1 flex flex-col">
        {view === "home" && <HomeView onNavigate={setView} />}
        {view === "content" && <ContentDashboard />}
        {view === "prospects" && <ProspectsView />}
        {view === "research" && <ResearchView onNavigate={setView} />}
        {view === "agents" && <AgentsView />}
        {view === "chat" && <ChatView />}
      </main>
    </div>
  );
}
