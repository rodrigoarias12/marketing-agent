import type { DraftDate, Post, Prospect, Research, Campaign, PipelineData, ContentStatus, DashboardKPIs, ActivityLogEntry, PendingAction, ResearchConfigEntry, ResearchJob, ResearchJobDetail, PipelineProgressEvent } from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Content ──
export const getDraftDates = () => request<DraftDate[]>("/drafts");
export const getDrafts = (date: string) => request<Post[]>(`/drafts/${date}`);
export const getImageList = (date: string) => request<string[]>(`/images/${date}`);
export const getPublished = () => request<{ date: string; content: string }[]>("/published");
export const publishPost = (
  date: string,
  postNumber: number,
  platform: string,
  carouselSlides?: Array<{ title: string; body: string; slideNumber: number }>,
  carouselTitle?: string,
) =>
  request<{ success: boolean; message: string; isCarousel?: boolean }>("/publish", {
    method: "POST",
    body: JSON.stringify({ date, postNumber, platform, carouselSlides, carouselTitle }),
  });
export const approvePost = (date: string, postNumber: number, platform: string) =>
  request<ContentStatus>("/publish/approve", {
    method: "PUT",
    body: JSON.stringify({ date, postNumber, platform }),
  });
export const editPostBody = (date: string, postNumber: number, body: string, platform?: string) =>
  request<ContentStatus>("/publish/edit", {
    method: "PUT",
    body: JSON.stringify({ date, postNumber, body, platform }),
  });
export const getContentStatus = (date: string) =>
  request<ContentStatus[]>(`/publish/status/${date}`);

// ── Campaigns ──
export const getCampaigns = () => request<Campaign[]>("/campaigns");
export const createCampaign = (data: { name: string; vertical?: string; description?: string }) =>
  request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(data) });
export const updateCampaign = (id: number, data: Partial<Campaign>) =>
  request<Campaign>(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCampaign = (id: number) =>
  request<{ success: boolean }>(`/campaigns/${id}`, { method: "DELETE" });

// ── Prospects ──
export const getProspects = (params?: { status?: string; region?: string; campaign?: number }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.region) qs.set("region", params.region);
  if (params?.campaign) qs.set("campaign", String(params.campaign));
  const q = qs.toString();
  return request<Prospect[]>(`/prospects${q ? `?${q}` : ""}`);
};
export const getProspectsPipeline = (params?: { campaign?: number; region?: string }) => {
  const qs = new URLSearchParams();
  if (params?.campaign) qs.set("campaign", String(params.campaign));
  if (params?.region) qs.set("region", params.region);
  const q = qs.toString();
  return request<PipelineData>(`/prospects/pipeline${q ? `?${q}` : ""}`);
};
export const createProspect = (data: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "lastFollowupAt" | "followupCount">) =>
  request<Prospect>("/prospects", { method: "POST", body: JSON.stringify(data) });
export const updateProspect = (id: number, data: Partial<Prospect>) =>
  request<Prospect>(`/prospects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const followUpProspect = (id: number, messageSent: string) =>
  request<Prospect>(`/prospects/${id}/followup`, { method: "PUT", body: JSON.stringify({ messageSent }) });
export const deleteProspect = (id: number) =>
  request<{ success: boolean }>(`/prospects/${id}`, { method: "DELETE" });

// ── Dashboard ──
export const getDashboardKPIs = () => request<DashboardKPIs>("/dashboard/kpis");
export const getActivity = (limit = 20) => request<ActivityLogEntry[]>(`/dashboard/activity?limit=${limit}`);
export const getPendingActions = () => request<PendingAction[]>("/dashboard/pending-actions");

// ── Research ──
export const getResearchList = (params?: { tag?: string; campaign?: number; category?: string }) => {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.campaign) qs.set("campaign", String(params.campaign));
  if (params?.category) qs.set("category", params.category);
  const q = qs.toString();
  return request<Research[]>(`/research${q ? `?${q}` : ""}`);
};
export const getResearchCategories = () => request<string[]>("/research/categories");
export const createResearch = (data: Omit<Research, "id" | "createdAt" | "updatedAt">) =>
  request<Research>("/research", { method: "POST", body: JSON.stringify(data) });
export const updateResearch = (id: number, data: Partial<Research>) =>
  request<Research>(`/research/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteResearch = (id: number) =>
  request<{ success: boolean }>(`/research/${id}`, { method: "DELETE" });
export const getResearchProspects = (researchId: number) =>
  request<Prospect[]>(`/research/${researchId}/prospects`);
export const linkResearchProspects = (researchId: number, prospectIds: number[]) =>
  request<{ success: boolean }>(`/research/${researchId}/prospects`, {
    method: "PUT",
    body: JSON.stringify({ prospectIds }),
  });
export const getProspectResearch = (prospectId: number) =>
  request<Research[]>(`/prospects/${prospectId}/research`);

// ── Research Config ──
export const getResearchConfigs = (type?: string) => {
  const qs = type ? `?type=${type}` : "";
  return request<ResearchConfigEntry[]>(`/research-config${qs}`);
};
export const createResearchConfig = (data: { type: string; name: string; url?: string; description?: string }) =>
  request<ResearchConfigEntry>("/research-config", { method: "POST", body: JSON.stringify(data) });
export const updateResearchConfig = (id: number, data: Partial<ResearchConfigEntry>) =>
  request<ResearchConfigEntry>(`/research-config/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteResearchConfig = (id: number) =>
  request<{ success: boolean }>(`/research-config/${id}`, { method: "DELETE" });

// ── Research Agent ──
export async function runResearchAgent(
  onProgress: (event: { phase: string; detail?: string }) => void,
  configIds?: number[]
): Promise<void> {
  const res = await fetch(`${BASE}/research/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ configIds }),
  });
  if (!res.ok) throw new Error(`Agent error: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          onProgress(parsed);
        } catch {}
      }
    }
  }
}

// ── Carousel ──
export interface CarouselSlide {
  title: string;
  body: string;
  slideNumber: number;
}

export interface CarouselPreviewResponse {
  success: boolean;
  totalSlides: number;
  slides: Array<{ slideNumber: number; title: string; body: string; charCount: number }>;
  metadata: {
    format: string;
    aspectRatio: string;
    recommendedSize: string;
    generatedAt: string;
  };
}

export const generateCarouselPreview = (slides: CarouselSlide[]) =>
  request<CarouselPreviewResponse>("/content/carousel/preview", {
    method: "POST",
    body: JSON.stringify({ slides }),
  });

export interface GeneratedCarouselSlide {
  headline: string;
  body: string;
  slideNumber: number;
}

export const generateCarouselSlides = (text: string, platform?: string, instructions?: string, currentSlides?: GeneratedCarouselSlide[]) =>
  request<{ slides: GeneratedCarouselSlide[] }>("/content/carousel/generate", {
    method: "POST",
    body: JSON.stringify({ text, platform, instructions, currentSlides }),
  });

// ── Content Generation ──
export const generateContent = (data: {
  date: string;
  researchIds?: number[];
  platforms?: string[];
  postCount?: number;
}) =>
  request<{ success: boolean; filePath: string; posts: Array<{ number: number; platform: string; type: string }> }>(
    "/content/generate", { method: "POST", body: JSON.stringify(data) }
  );

// ── Agents ──
export interface AgentStateDTO {
  name: string;
  role: string;
  status: "idle" | "working" | "break";
  currentTask: string;
  color: string;
  lastUpdated: string;
}

export interface AgentActivityDTO {
  id: number;
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface CommandProgressDTO {
  type: "tool_dispatch" | "agent_update" | "text_chunk" | "done" | "error";
  agent?: string;
  tool?: string;
  content?: string;
}

export const getAgents = () => request<Record<string, AgentStateDTO>>("/agents");
export const getAgentActivity = (limit = 30) =>
  request<AgentActivityDTO[]>(`/agents/activity?limit=${limit}`);

export async function sendAgentCommand(
  command: string,
  onProgress: (event: CommandProgressDTO) => void
): Promise<void> {
  const res = await fetch(`${BASE}/agents/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error(`Command error: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          onProgress(JSON.parse(data));
        } catch {
          // skip
        }
      }
    }
  }
}

export function subscribeAgentStream(
  onEvent: (event: string, data: unknown) => void
): () => void {
  const es = new EventSource(`${BASE}/agents/stream`);
  es.addEventListener("snapshot", (e) => {
    try { onEvent("snapshot", JSON.parse(e.data)); } catch {}
  });
  es.addEventListener("agent-update", (e) => {
    try { onEvent("agent-update", JSON.parse(e.data)); } catch {}
  });
  es.addEventListener("activity", (e) => {
    try { onEvent("activity", JSON.parse(e.data)); } catch {}
  });
  es.onerror = () => { /* EventSource auto-reconnects */ };
  return () => es.close();
}

// ── Research Pipeline ──
export const startResearchPipeline = (data: {
  niche: string;
  competitors: string[];
  platforms: string[];
}) =>
  request<{ jobId: number; status: string }>("/research-pipeline/run", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getResearchJobs = () =>
  request<ResearchJob[]>("/research-pipeline/jobs");

export const getResearchJobDetail = (id: number) =>
  request<ResearchJobDetail>(`/research-pipeline/jobs/${id}`);

export function streamResearchJob(
  jobId: number,
  onProgress: (event: PipelineProgressEvent) => void
): () => void {
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(`${BASE}/research-pipeline/jobs/${jobId}/stream`);
      if (!res.ok) throw new Error(`Stream error: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              onProgress(JSON.parse(data));
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (!cancelled) {
        onProgress({ step: "error", detail: err.message });
      }
    }
  })();

  return () => { cancelled = true; };
}

// ── Scout: Research Topics ──
export interface ResearchTopicDTO {
  id: number;
  topic: string;
  category: string;
  enabled: boolean;
  createdAt: string;
  lastResearchedAt: string | null;
}

export interface SchedulerStatusDTO {
  active: boolean;
  running: boolean;
  intervalHours: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export const getResearchTopics = () =>
  request<ResearchTopicDTO[]>("/research-config/topics");

export const addResearchTopic = (topic: string, category: string) =>
  request<ResearchTopicDTO>("/research-config/topics", {
    method: "POST",
    body: JSON.stringify({ topic, category }),
  });

export const updateResearchTopic = (id: number, data: Partial<{ topic: string; category: string; enabled: boolean }>) =>
  request<ResearchTopicDTO>(`/research-config/topics/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteResearchTopic = (id: number) =>
  request<{ success: boolean }>(`/research-config/topics/${id}`, {
    method: "DELETE",
  });

export const getScoutSchedulerStatus = () =>
  request<SchedulerStatusDTO>("/research-config/scheduler/status");

export const startScoutScheduler = (intervalHours: number) =>
  request<SchedulerStatusDTO & { success: boolean }>("/research-config/scheduler/start", {
    method: "POST",
    body: JSON.stringify({ intervalHours }),
  });

export const stopScoutScheduler = () =>
  request<SchedulerStatusDTO & { success: boolean }>("/research-config/scheduler/stop", {
    method: "POST",
  });

export const runScoutNow = () =>
  request<{ success: boolean; count: number; titles: string[] }>("/research-config/run-now", {
    method: "POST",
  });

// ── Chat ──
export async function sendChatMessage(
  message: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    // Parse SSE chunks
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
          if (parsed.error) throw new Error(parsed.error);
        } catch {
          // Non-JSON data, treat as raw text
          onChunk(data);
        }
      }
    }
  }
}
