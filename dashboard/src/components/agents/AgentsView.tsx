import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "../layout/Header";
import {
  Zap, Search, FileText, Users, MessageCircle, Sparkles,
  Send, Loader2, Terminal, Activity, ChevronDown, ChevronUp,
  Building2, LayoutGrid,
} from "lucide-react";
import { PixelOffice } from "./PixelOffice";
import type { OfficeAgent } from "./PixelOffice";
import {
  subscribeAgentStream,
  sendAgentCommand,
  getAgentActivity,
} from "../../api/client";
import type { AgentStateDTO, AgentActivityDTO, CommandProgressDTO } from "../../api/client";

// ── Static pixel art + metadata for each agent ──

interface AgentMeta {
  id: string;
  backendId: string; // key in agent-state map
  name: string;
  role: string;
  description: string;
  icon: typeof Zap;
  pixel: string[][];
  colors: { primary: string; secondary: string; accent: string };
  officeColor: number;
}

const AGENTS_META: AgentMeta[] = [
  {
    id: "eddie", backendId: "eddie", name: "Eddie", role: "AI Strategy Lead",
    description: "Agente principal. Coordina campanas, genera contenido y gestiona operaciones desde Mission Control.",
    icon: Zap,
    colors: { primary: "#7c5b8a", secondary: "#5a3d6b", accent: "#bc8fd4" },
    officeColor: 0x7c5b8a,
    pixel: [
      ["", "", "", "2", "2", "2", "2", "", "", ""],
      ["", "", "2", "1", "1", "1", "1", "2", "", ""],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["2", "1", "3", "1", "1", "1", "3", "1", "1", "2"],
      ["2", "1", "1", "1", "2", "2", "1", "1", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["", "2", "1", "1", "2", "2", "1", "1", "2", ""],
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "2", "2", "1", "1", "1", "1", "2", "2", ""],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["", "2", "2", "1", "1", "1", "1", "2", "2", ""],
    ],
  },
  {
    id: "scout", backendId: "scout", name: "Scout", role: "Research Agent",
    description: "Investigador de inteligencia competitiva. Busca en la web, analiza competidores y guarda hallazgos.",
    icon: Search,
    colors: { primary: "#5b7ea8", secondary: "#3d5a80", accent: "#98c1d9" },
    officeColor: 0x5b7ea8,
    pixel: [
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "3", "3", "1", "1", "3", "3", "1", "2"],
      ["2", "1", "3", "3", "1", "1", "3", "3", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["", "", "2", "1", "2", "2", "1", "2", "", ""],
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["2", "3", "1", "1", "1", "1", "1", "1", "3", "2"],
      ["", "2", "2", "1", "1", "1", "1", "2", "2", ""],
    ],
  },
  {
    id: "pixel", backendId: "copywriter", name: "Pixel", role: "Content Creator",
    description: "Generador de contenido AI. Crea posts para LinkedIn y X basados en research y tono de marca.",
    icon: FileText,
    colors: { primary: "#c97b2a", secondary: "#8b5e14", accent: "#f0c674" },
    officeColor: 0xc97b2a,
    pixel: [
      ["", "", "", "2", "2", "2", "2", "", "", ""],
      ["", "", "2", "3", "3", "3", "3", "2", "", ""],
      ["", "2", "3", "1", "1", "1", "1", "3", "2", ""],
      ["2", "1", "1", "2", "1", "1", "2", "1", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["", "2", "1", "2", "1", "1", "2", "1", "2", ""],
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "3", "2", "1", "1", "1", "1", "2", "3", ""],
      ["3", "3", "1", "1", "1", "1", "1", "1", "3", "3"],
      ["", "", "2", "1", "1", "1", "1", "2", "", ""],
      ["", "2", "2", "1", "1", "1", "1", "2", "2", ""],
    ],
  },
  {
    id: "link", backendId: "scheduler", name: "Link", role: "Publishing Agent",
    description: "Agente de scheduling y publishing. Gestiona la cola de publicacion y coordina timing.",
    icon: Users,
    colors: { primary: "#8b5ca8", secondary: "#6b3fa0", accent: "#c39bd3" },
    officeColor: 0x8b5ca8,
    pixel: [
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "3", "1", "1", "1", "1", "3", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "1", "2", "1", "1", "2", "1", "1", "2"],
      ["", "2", "1", "1", "2", "2", "1", "1", "2", ""],
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "3", "3", "1", "1", "1", "1", "3", "3", ""],
      ["3", "3", "1", "1", "1", "1", "1", "1", "3", "3"],
      ["", "3", "1", "1", "1", "1", "1", "1", "3", ""],
      ["", "", "2", "2", "1", "1", "2", "2", "", ""],
    ],
  },
  {
    id: "analyst", backendId: "analyst", name: "Analyst", role: "Data Analyst",
    description: "Analista de datos de marketing. Crunches numbers, trackea KPIs y genera insights actionable.",
    icon: Activity,
    colors: { primary: "#e07844", secondary: "#b85c30", accent: "#f4a460" },
    officeColor: 0xe07844,
    pixel: [
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "3", "1", "1", "1", "1", "3", "1", "2"],
      ["2", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
      ["2", "1", "1", "3", "3", "3", "3", "1", "1", "2"],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["", "", "2", "2", "2", "2", "2", "2", "", ""],
      ["", "3", "2", "1", "1", "1", "1", "2", "3", ""],
      ["3", "1", "1", "1", "1", "1", "1", "1", "1", "3"],
      ["", "2", "1", "1", "1", "1", "1", "1", "2", ""],
      ["", "", "2", "2", "1", "1", "2", "2", "", ""],
    ],
  },
];

// ── Pixel Avatar renderer ──
function PixelAvatar({
  pixels,
  colors,
  size = 6,
}: {
  pixels: string[][];
  colors: { primary: string; secondary: string; accent: string };
  size?: number;
}) {
  const colorMap: Record<string, string> = {
    "1": colors.primary,
    "2": colors.secondary,
    "3": colors.accent,
  };
  return (
    <div
      className="inline-grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${pixels[0]?.length ?? 0}, ${size}px)`,
        gap: "1px",
        imageRendering: "pixelated",
      }}
    >
      {pixels.flat().map((cell, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            backgroundColor: cell ? colorMap[cell] || "transparent" : "transparent",
            borderRadius: cell ? "1px" : 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Status badge ──
function AgentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    working: "bg-success-base/15 text-success-base border-success-base/30",
    idle: "bg-overlay text-el-mid border-outline",
    break: "bg-warning-base/15 text-warning-dark border-warning-base/30",
  };
  const labels: Record<string, string> = {
    working: "Trabajando",
    idle: "Inactivo",
    break: "Pausa",
  };
  const dotColors: Record<string, string> = {
    working: "bg-success-base animate-pulse",
    idle: "bg-el-disabled",
    break: "bg-warning-dark animate-pulse",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md label-md border ${styles[status] || styles.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status] || dotColors.idle}`} />
      {labels[status] || status}
    </span>
  );
}

// ── Agent Card (live state) ──
function AgentCard({
  meta,
  liveState,
}: {
  meta: AgentMeta;
  liveState?: AgentStateDTO;
}) {
  const status = liveState?.status || "idle";
  const currentTask = liveState?.currentTask || "";
  const name = liveState?.name || meta.name;
  const role = liveState?.role || meta.role;
  const isWorking = status === "working";

  return (
    <div
      className={`bg-surface border rounded-xl p-5 shadow-low transition-all duration-300 relative overflow-hidden ${
        isWorking ? "border-success-base/40 shadow-mid" : "border-outline"
      }`}
    >
      {isWorking && (
        <div className="absolute inset-0 bg-gradient-to-br from-success-base/5 to-transparent pointer-events-none" />
      )}
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`p-2.5 rounded-xl border-2 transition-transform duration-300 ${isWorking ? "scale-110" : ""}`}
            style={{
              borderColor: meta.colors.accent + "40",
              backgroundColor: meta.colors.primary + "08",
            }}
          >
            <PixelAvatar pixels={meta.pixel} colors={meta.colors} size={4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="title-md text-el-high">{name}</h3>
              <AgentStatusBadge status={status} />
            </div>
            <p className="label-lg uppercase tracking-wider" style={{ color: meta.colors.primary }}>
              {role}
            </p>
          </div>
        </div>

        {isWorking && currentTask ? (
          <div className="bg-success-base/8 border border-success-base/20 rounded-lg px-3 py-2">
            <p className="label-md text-success-base flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              {currentTask}
            </p>
          </div>
        ) : (
          <p className="body-sm text-el-low">{meta.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Command Console ──
function CommandConsole({
  onSend,
  isProcessing,
  responseText,
  activeTools,
}: {
  onSend: (cmd: string) => void;
  isProcessing: boolean;
  responseText: string;
  activeTools: string[];
}) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [responseText, activeTools]);

  const handleSubmit = () => {
    const cmd = input.trim();
    if (!cmd || isProcessing) return;
    onSend(cmd);
    setInput("");
  };

  return (
    <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-low">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-overlay/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-darker-ext" />
          <span className="title-sm text-el-high">Eddie Command Console</span>
          {isProcessing && (
            <span className="label-md text-success-base flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Procesando...
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-el-low" /> : <ChevronDown className="w-4 h-4 text-el-low" />}
      </button>

      {expanded && (
        <div className="border-t border-outline">
          <div
            ref={outputRef}
            className="bg-[#0d1117] text-[#c9d1d9] font-mono text-xs p-4 max-h-64 overflow-y-auto custom-scrollbar"
            style={{ minHeight: "100px" }}
          >
            {!responseText && activeTools.length === 0 && !isProcessing && (
              <p className="text-[#484f58]">
                {'>'} Envia un comando a Eddie. Ej: "Investiga competidores en fintech", "Genera 3 posts para LinkedIn"...
              </p>
            )}
            {activeTools.map((t, i) => (
              <p key={i} className="text-[#58a6ff]">[tool] {t}</p>
            ))}
            {responseText && <div className="whitespace-pre-wrap mt-1">{responseText}</div>}
            {isProcessing && !responseText && activeTools.length === 0 && (
              <p className="text-[#484f58] animate-pulse">Pensando...</p>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-[#21262d] bg-[#0d1117]">
            <span className="text-violet-darker-ext font-mono text-sm">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Envia un comando a Eddie..."
              disabled={isProcessing}
              className="flex-1 bg-transparent text-[#c9d1d9] font-mono text-sm placeholder:text-[#484f58] outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="p-1.5 rounded-md text-el-low hover:text-violet-darker-ext disabled:opacity-30 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activity feed ──
function AgentActivityFeed({ activities }: { activities: AgentActivityDTO[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="body-sm text-el-low">Sin actividad reciente.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-overlay/50 transition">
          <Activity className="w-3 h-3 text-el-disabled mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="label-md text-el-mid">
              <span className="text-el-high font-medium">{a.agent}</span>{" "}
              <span className="text-el-low">{a.action}</span>{" "}
              {a.detail}
            </p>
            <p className="label-md text-el-disabled">
              {new Date(a.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helper: map backend state to PixelOffice format ──
function toOfficeAgents(
  liveStates: Record<string, AgentStateDTO>,
): OfficeAgent[] {
  return AGENTS_META.map((meta) => {
    const live = liveStates[meta.backendId];
    return {
      id: meta.id,
      name: live?.name || meta.name,
      role: live?.role || meta.role,
      status: live?.status === "working" ? "working" : live?.status === "break" ? "idle" : "idle",
      currentTask: live?.currentTask || "",
      color: meta.officeColor,
    };
  });
}

// ── Main View ──

export function AgentsView() {
  const [tab, setTab] = useState<"office" | "cards">("office");
  const [agentStates, setAgentStates] = useState<Record<string, AgentStateDTO>>({});
  const [activities, setActivities] = useState<AgentActivityDTO[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [activeTools, setActiveTools] = useState<string[]>([]);

  // Subscribe to SSE + load initial activity
  useEffect(() => {
    getAgentActivity(30).then(setActivities).catch(() => {});

    const unsubscribe = subscribeAgentStream((event, data) => {
      if (event === "snapshot") {
        setAgentStates(data as Record<string, AgentStateDTO>);
      } else if (event === "agent-update") {
        const update = data as AgentStateDTO & { id: string };
        setAgentStates((prev) => ({ ...prev, [update.id]: update }));
      } else if (event === "activity") {
        setActivities((prev) => [data as AgentActivityDTO, ...prev].slice(0, 50));
      }
    });

    return unsubscribe;
  }, []);

  const handleRefresh = useCallback(() => {
    getAgentActivity(30).then(setActivities).catch(() => {});
  }, []);

  const handleCommand = async (command: string) => {
    setIsProcessing(true);
    setResponseText("");
    setActiveTools([]);

    try {
      await sendAgentCommand(command, (event: CommandProgressDTO) => {
        if (event.type === "tool_dispatch" && event.tool) {
          setActiveTools((prev) => [...prev, event.tool!]);
        } else if (event.type === "text_chunk" && event.content) {
          setResponseText((prev) => prev + event.content);
        } else if (event.type === "error" && event.content) {
          setResponseText((prev) => prev + "\n[ERROR] " + event.content);
        }
      });
    } catch (e: any) {
      setResponseText((prev) => prev + "\n[ERROR] " + e.message);
    } finally {
      setIsProcessing(false);
      handleRefresh();
    }
  };

  const workingCount = Object.values(agentStates).filter((a) => a.status === "working").length;
  const officeAgents = toOfficeAgents(agentStates);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header view="agents" onRefresh={handleRefresh}>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-overlay rounded-lg p-0.5 border border-outline">
            <button
              onClick={() => setTab("office")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md label-lg transition-all cursor-pointer ${
                tab === "office"
                  ? "bg-violet-lighter-ext text-violet-darker-ext shadow-sm"
                  : "text-el-mid hover:text-el-high"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Office
            </button>
            <button
              onClick={() => setTab("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md label-lg transition-all cursor-pointer ${
                tab === "cards"
                  ? "bg-violet-lighter-ext text-violet-darker-ext shadow-sm"
                  : "text-el-mid hover:text-el-high"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>
          <span className="label-lg text-el-disabled">|</span>
          {workingCount > 0 && (
            <>
              <span className="label-lg text-success-base">{workingCount} trabajando</span>
              <span className="label-lg text-el-disabled">|</span>
            </>
          )}
          <span className="label-lg text-el-mid">{AGENTS_META.length} agentes</span>
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Command Console — always visible in both tabs */}
        <CommandConsole
          onSend={handleCommand}
          isProcessing={isProcessing}
          responseText={responseText}
          activeTools={activeTools}
        />

        {tab === "office" ? (
          <>
            {/* Pixel office canvas */}
            <div className="flex justify-center">
              <PixelOffice agents={officeAgents} />
            </div>

            {/* Agent status strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {AGENTS_META.map((meta) => {
                const live = agentStates[meta.backendId];
                const status = live?.status || "idle";
                return (
                  <div
                    key={meta.id}
                    className={`bg-surface border rounded-xl p-4 flex items-center gap-3 transition-all ${
                      status === "working" ? "border-success-base/40" : "border-outline"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${status === "working" ? "animate-pulse" : ""}`}
                      style={{
                        backgroundColor: status === "idle"
                          ? "#b0a9b8"
                          : meta.colors.primary,
                        opacity: status === "idle" ? 0.5 : 1,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="label-lg text-el-high truncate">{meta.name}</p>
                      <p className="label-md text-el-low truncate">{meta.role}</p>
                      <p className="label-md text-el-mid truncate mt-0.5">
                        {status === "working" && live?.currentTask
                          ? live.currentTask
                          : "En espera"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Hero banner */}
            <div className="bg-surface border border-outline rounded-xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 7px, currentColor 7px, currentColor 8px),
                                 repeating-linear-gradient(90deg, transparent, transparent 7px, currentColor 7px, currentColor 8px)`,
              }} />
              <div className="relative z-10 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {AGENTS_META.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-2 bg-surface border-2 border-outline rounded-lg">
                      <PixelAvatar pixels={a.pixel} colors={a.colors} size={4} />
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="title-lg text-el-high mb-1">Eddie Agent Squad</h2>
                  <p className="body-sm text-el-mid">
                    {AGENTS_META.length} agentes AI especializados. Envia comandos desde la consola y observa como Eddie coordina al equipo en tiempo real.
                  </p>
                </div>
              </div>
            </div>

            {/* Agent cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {AGENTS_META.map((meta) => (
                <AgentCard
                  key={meta.id}
                  meta={meta}
                  liveState={agentStates[meta.backendId]}
                />
              ))}
            </div>
          </>
        )}

        {/* Activity feed */}
        <div className="bg-surface border border-outline rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-outline flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-el-low" />
            <span className="title-sm text-el-high">Actividad de agentes</span>
          </div>
          <div className="p-2">
            <AgentActivityFeed activities={activities} />
          </div>
        </div>
      </div>
    </div>
  );
}
