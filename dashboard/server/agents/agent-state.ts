// ── In-memory agent state store ──
// Tracks the status of every agent in Eddie's squad and broadcasts changes via SSE.

export interface AgentState {
  name: string;
  role: string;
  status: "idle" | "working" | "break";
  currentTask: string;
  color: string;
  lastUpdated: Date;
}

export interface ActivityEntry {
  id: number;
  agent: string;
  action: string;
  detail: string;
  timestamp: Date;
}

// ── Default agents ──
const defaults: Record<string, Omit<AgentState, "lastUpdated">> = {
  eddie: { name: "Eddie", role: "AI Strategy Lead", status: "idle", currentTask: "", color: "#4a7c59" },
  scout: { name: "Scout", role: "Research Agent", status: "idle", currentTask: "", color: "#5b7ea8" },
  copywriter: { name: "Pixel", role: "Content Creator", status: "idle", currentTask: "", color: "#c97b2a" },
  analyst: { name: "Analyst", role: "Data Analyst", status: "idle", currentTask: "", color: "#e07844" },
  scheduler: { name: "Link", role: "Publishing Agent", status: "idle", currentTask: "", color: "#8b5ca8" },
};

// ── State ──
const agentStates: Map<string, AgentState> = new Map();
const activityLog: ActivityEntry[] = [];
let activityIdCounter = 0;

// Initialize
for (const [id, def] of Object.entries(defaults)) {
  agentStates.set(id, { ...def, lastUpdated: new Date() });
}

// ── SSE Subscribers ──
type Listener = (event: string, data: unknown) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function broadcast(event: string, data: unknown) {
  for (const fn of listeners) {
    try { fn(event, data); } catch { /* ignore dead connections */ }
  }
}

// ── Public API ──

export function getAllAgents(): Record<string, AgentState> {
  const out: Record<string, AgentState> = {};
  for (const [id, state] of agentStates) {
    out[id] = { ...state };
  }
  return out;
}

export function getAgent(id: string): AgentState | undefined {
  const s = agentStates.get(id);
  return s ? { ...s } : undefined;
}

export function updateAgent(
  id: string,
  patch: Partial<Pick<AgentState, "status" | "currentTask">>
): AgentState | undefined {
  const current = agentStates.get(id);
  if (!current) return undefined;

  const updated: AgentState = {
    ...current,
    ...patch,
    lastUpdated: new Date(),
  };
  agentStates.set(id, updated);

  // Log activity
  if (patch.status === "working" && patch.currentTask) {
    pushActivity(current.name, "started", patch.currentTask);
  } else if (patch.status === "idle") {
    pushActivity(current.name, "finished", current.currentTask || "task");
  }

  broadcast("agent-update", { id, ...updated });
  return { ...updated };
}

export function resetAllAgents(): void {
  for (const [id, def] of Object.entries(defaults)) {
    const updated: AgentState = { ...def, lastUpdated: new Date() };
    agentStates.set(id, updated);
    broadcast("agent-update", { id, ...updated });
  }
}

// ── Activity log ──

function pushActivity(agent: string, action: string, detail: string) {
  const entry: ActivityEntry = {
    id: ++activityIdCounter,
    agent,
    action,
    detail,
    timestamp: new Date(),
  };
  activityLog.unshift(entry);
  // Keep last 100
  if (activityLog.length > 100) activityLog.length = 100;
  broadcast("activity", entry);
}

export function addActivity(agent: string, action: string, detail: string) {
  pushActivity(agent, action, detail);
}

export function getActivityLog(limit = 30): ActivityEntry[] {
  return activityLog.slice(0, limit);
}
