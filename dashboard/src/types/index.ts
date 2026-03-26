// ── Content ──
export interface Post {
  number: number;
  headerDescription: string;
  platform: string;
  type: string;
  pillar: string;
  series: string;
  body: string;
  cta: string;
  utm: string;
  hashtags: string;
  image: ImageMeta | null;
  postingTime: string;
  statusInfo: PostStatusInfo | null;
}

export interface ImageMeta {
  type: string;
  dimensions: string;
  description: string;
  textOnImage: string;
  style: string;
}

export interface DraftDate {
  date: string;
  postCount: number;
}

export type ContentStatusType = "draft" | "approved" | "publishing" | "published" | "failed";

export interface ContentStatus {
  id: number;
  date: string;
  postNumber: number;
  platform: string;
  status: ContentStatusType;
  publishedUrl: string;
  publishedAt: string | null;
  approvedAt: string | null;
  bodyOverride: string | null;
  notes: string;
}

export interface PostStatusInfo {
  status: ContentStatusType;
  publishedAt: string | null;
  publishedUrl: string;
  approvedAt: string | null;
  bodyOverride: string | null;
  notes: string;
}

// ── Campaigns ──
export interface Campaign {
  id: number;
  name: string;
  vertical: string;
  description: string;
  status: "active" | "paused" | "completed";
  prospectCount: number;
  pendienteCount: number;
  aceptadaCount: number;
  dmSentCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Prospects ──
export type ProspectStatus = "pendiente" | "aceptada" | "rechazada" | "dm_sent";
export type ProspectRegion = "argentina" | "miami" | string;

export interface Prospect {
  id: number;
  name: string;
  company: string;
  role: string;
  location: string;
  linkedinUrl: string;
  degree: string;
  status: ProspectStatus;
  messageSent: string;
  notes: string;
  region: ProspectRegion;
  campaignId: number | null;
  lastFollowupAt: string | null;
  followupCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineData {
  pendiente: Prospect[];
  aceptada: Prospect[];
  dm_sent: Prospect[];
  rechazada: Prospect[];
}

// ── Research ──
export type ResearchCategory = "general" | "competencia" | "industria" | "contenido" | "prospects" | string;

export interface Research {
  id: number;
  title: string;
  sourceUrl: string;
  tags: string;
  summary: string;
  content: string;
  brandName: string;
  campaignId: number | null;
  category: ResearchCategory;
  createdAt: string;
  updatedAt: string;
}

// ── Research Config ──
export type ResearchConfigType = "competitor" | "industry" | "source";

export interface ResearchConfigEntry {
  id: number;
  type: ResearchConfigType;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Chat ──
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ── Dashboard / KPIs ──
export interface DashboardKPIs {
  prospects: {
    total: number;
    pendiente: number;
    aceptada: number;
    dmSent: number;
    rechazada: number;
  };
  content: {
    published: number;
    approved: number;
    draft: number;
    failed: number;
  };
  research: { total: number };
  campaigns: { total: number };
}

export interface ActivityLogEntry {
  id: number;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata: string;
  createdAt: string;
}

export interface PendingAction {
  type: string;
  count: number;
  description: string;
  navigateTo: View;
}

// ── Research Pipeline ──
export type ResearchJobStatus = "pending" | "running" | "completed" | "failed";

export interface ResearchJob {
  id: number;
  niche: string;
  competitors: string[];
  platforms: string[];
  status: ResearchJobStatus;
  currentStep: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ResearchResultEntry {
  id: number;
  jobId: number;
  type: "queries" | "search" | "extract" | "analysis" | "content_ideas";
  data: any;
  createdAt: string;
}

export interface ResearchJobDetail extends ResearchJob {
  results: ResearchResultEntry[];
}

export interface PipelineProgressEvent {
  step: string;
  detail: string;
  progress?: number;
}

// ── Views ──
export type View = "home" | "content" | "prospects" | "research" | "agents" | "chat";
