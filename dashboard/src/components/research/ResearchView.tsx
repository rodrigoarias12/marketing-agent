import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Header } from "../layout/Header";
import {
  getResearchList, createResearch, deleteResearch,
  getCampaigns, getResearchProspects, linkResearchProspects,
  getProspects, runResearchAgent, getResearchJobs,
  startResearchPipeline, streamResearchJob, generateContent,
  getResearchTopics, addResearchTopic, updateResearchTopic,
  deleteResearchTopic, getScoutSchedulerStatus, startScoutScheduler,
  stopScoutScheduler, runScoutNow,
} from "../../api/client";
import type { ResearchTopicDTO, SchedulerStatusDTO } from "../../api/client";
import type { Research, Campaign, Prospect, ResearchJob, PipelineProgressEvent, View } from "../../types";
import {
  Search, ExternalLink, Tag, Trash2, X, Globe, Lightbulb, Users,
  Link2, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle,
  Clock, Send, Plus, Square, CheckSquare, Sparkles, ArrowRight,
  Radar, Power, Play, Pause, ToggleLeft, ToggleRight,
} from "lucide-react";

const CATEGORIES = [
  { value: "", label: "Todos" },
  { value: "competencia", label: "Competencia" },
  { value: "industria", label: "Industria" },
  { value: "contenido", label: "Contenido" },
  { value: "prospects", label: "Prospects" },
  { value: "general", label: "General" },
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "hace 1 dia";
  if (diffDays < 30) return `hace ${diffDays} dias`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "hace 1 mes";
  return `hace ${diffMonths} meses`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ResearchView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const [items, setItems] = useState<Research[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCampaign, setFilterCampaign] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [linkingResearch, setLinkingResearch] = useState<number | null>(null);
  const [showNewResearch, setShowNewResearch] = useState(false);

  // ── Selection state ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Generate content modal ──
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePlatform, setGeneratePlatform] = useState<"linkedin" | "twitter" | "both">("linkedin");
  const [generatePostCount, setGeneratePostCount] = useState(1);
  const [generateDate, setGenerateDate] = useState(todayStr());
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Success toast ──
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, camps] = await Promise.all([
        getResearchList({
          category: filterCategory || undefined,
          campaign: filterCampaign,
        }),
        getCampaigns(),
      ]);
      setItems(data);
      setCampaigns(camps);
    } catch (e) {
      console.error("Failed to fetch research:", e);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterCampaign]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminar esta investigacion?")) return;
    await deleteResearch(id);
    fetchData();
  };

  // ── Selection helpers ──
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Generate content ──
  const handleOpenGenerate = (preSelectedIds?: number[]) => {
    if (preSelectedIds) {
      setSelectedIds(new Set(preSelectedIds));
    }
    setGeneratePlatform("linkedin");
    setGeneratePostCount(1);
    setGenerateDate(todayStr());
    setGenerateError(null);
    setShowGenerateModal(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const platforms: string[] =
        generatePlatform === "both"
          ? ["linkedin", "twitter"]
          : [generatePlatform];
      await generateContent({
        date: generateDate,
        researchIds: Array.from(selectedIds),
        platforms,
        postCount: generatePostCount,
      });
      setShowGenerateModal(false);
      setShowSuccessToast(true);
      clearSelection();
      setTimeout(() => setShowSuccessToast(false), 8000);
    } catch (e: any) {
      setGenerateError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Client-side text search across title, summary, brandName, tags
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        item.brandName?.toLowerCase().includes(q) ||
        item.tags?.toLowerCase().includes(q) ||
        item.content?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Sort newest first
  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col min-h-screen relative">
      <Header view="research" onRefresh={fetchData} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
        {/* ── Search + Filters ── */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-el-low" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en resultados..."
              className="w-full bg-surface border border-outline rounded-xl pl-10 pr-4 py-2.5 body-sm text-el-high placeholder:text-el-disabled focus:outline-none focus:ring-1 focus:ring-violet-darker"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-el-low hover:text-el-high cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category pills + campaign filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
                    filterCategory === cat.value
                      ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                      : "text-el-mid hover:bg-overlay"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <select
              value={filterCampaign ?? ""}
              onChange={(e) => setFilterCampaign(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-surface border border-outline rounded-lg px-3 py-1.5 label-lg text-el-mid focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
            >
              <option value="">Todas las campanas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <span className="label-lg text-el-low ml-auto">
              {sorted.length} resultado{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Research Results ── */}
        {loading ? (
          <div className="text-center text-el-low body-sm py-20">Cargando...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Lightbulb className="w-12 h-12 text-el-disabled mx-auto" />
            <p className="body-sm text-el-mid">
              {searchQuery ? "Sin resultados para esa busqueda" : "No hay investigaciones todavia"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewResearch(true)}
                className="body-sm text-violet-darker-ext hover:text-violet-darker cursor-pointer"
              >
                Investigar un tema
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((item) => (
              <ResearchCard
                key={item.id}
                item={item}
                campaigns={campaigns}
                expanded={expanded === item.id}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelection(item.id)}
                onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                onDelete={() => handleDelete(item.id)}
                onLinkProspects={() => setLinkingResearch(item.id)}
              />
            ))}
          </div>
        )}

        {/* ── Investigar Nuevo Tema (collapsible) ── */}
        <NewResearchSection
          isOpen={showNewResearch}
          onToggle={() => setShowNewResearch(!showNewResearch)}
          campaigns={campaigns}
          onComplete={fetchData}
          onGenerateFromNew={(newItemIds) => handleOpenGenerate(newItemIds)}
        />
      </div>

      {linkingResearch && (
        <LinkProspectsModal
          researchId={linkingResearch}
          onClose={() => { setLinkingResearch(null); fetchData(); }}
        />
      )}

      {/* ── Floating Selection Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
          <span className="label-lg text-gray-300">
            {selectedIds.size} investigacion{selectedIds.size !== 1 ? "es" : ""} seleccionada{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={() => handleOpenGenerate()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl label-lg transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generar contenido
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white label-lg transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Deseleccionar
          </button>
        </div>
      )}

      {/* ── Generate Content Modal ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => !generating && setShowGenerateModal(false)}>
          <div
            className="bg-surface border border-outline rounded-xl w-full max-w-sm p-6 space-y-5 shadow-high"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="title-lg text-el-high flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-darker" />
                Generar contenido
              </h3>
              <button
                onClick={() => !generating && setShowGenerateModal(false)}
                className="text-el-low hover:text-el-high cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="body-sm text-el-mid">
              Se usaran {selectedIds.size} investigacion{selectedIds.size !== 1 ? "es" : ""} como base para generar posts.
            </p>

            {/* Platform */}
            <div>
              <label className="label-md text-el-low uppercase tracking-wider block mb-2">Plataforma</label>
              <div className="flex gap-1">
                {([
                  { value: "linkedin" as const, label: "LinkedIn" },
                  { value: "twitter" as const, label: "Twitter" },
                  { value: "both" as const, label: "Ambos" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGeneratePlatform(opt.value)}
                    className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
                      generatePlatform === opt.value
                        ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                        : "text-el-mid hover:bg-overlay"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post count */}
            <div>
              <label className="label-md text-el-low uppercase tracking-wider block mb-2">Cantidad de posts</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGeneratePostCount(n)}
                    className={`w-9 h-9 rounded-lg label-lg transition cursor-pointer ${
                      generatePostCount === n
                        ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                        : "text-el-mid hover:bg-overlay"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="label-md text-el-low uppercase tracking-wider block mb-2">Fecha</label>
              <input
                type="date"
                value={generateDate}
                onChange={(e) => setGenerateDate(e.target.value)}
                className="w-full bg-surface-accent border border-outline rounded-lg px-3 py-2 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
              />
            </div>

            {generateError && (
              <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-3 py-2">
                <p className="body-sm text-error-base">{generateError}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary contained w-full py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando contenido con {selectedIds.size} investigacion{selectedIds.size !== 1 ? "es" : ""}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar {generatePostCount} post{generatePostCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Success Toast ── */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-gray-700/50 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
          <span className="body-sm">Post generado exitosamente</span>
          <button
            onClick={() => {
              setShowSuccessToast(false);
              onNavigate?.("content");
            }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ml-2"
          >
            Ver en Content
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="text-gray-400 hover:text-white cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Research Result Card ──

function ResearchCard({ item, campaigns, expanded, selected, onToggleSelect, onToggle, onDelete, onLinkProspects }: {
  item: Research;
  campaigns: Campaign[];
  expanded: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onLinkProspects: () => void;
}) {
  const [linkedProspects, setLinkedProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    if (expanded) {
      getResearchProspects(item.id).then(setLinkedProspects).catch(() => {});
    }
  }, [expanded, item.id]);

  const campaign = campaigns.find((c) => c.id === item.campaignId);

  return (
    <div
      className={`bg-surface border rounded-xl shadow-low hover:shadow-mid transition-all ${
        selected ? "border-violet-darker ring-1 ring-violet-darker/30" : expanded ? "border-violet-darker/30" : "border-outline"
      }`}
    >
      {/* Collapsed view - always visible */}
      <div className="p-5 space-y-2">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className="mt-0.5 shrink-0 cursor-pointer"
          >
            {selected ? (
              <CheckSquare className="w-4.5 h-4.5 text-violet-darker" />
            ) : (
              <Square className="w-4.5 h-4.5 text-el-disabled hover:text-el-mid transition" />
            )}
          </button>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <h4 className="title-sm text-el-high leading-snug">{item.title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {item.brandName && (
                <span className="label-lg text-violet-darker font-medium">{item.brandName}</span>
              )}
              {item.category && item.category !== "general" && (
                <span className="label-md px-2 py-0.5 rounded-md bg-overlay text-el-mid capitalize">
                  {item.category}
                </span>
              )}
              {campaign && (
                <span className="label-md px-2 py-0.5 rounded-md bg-violet-lighter-ext/50 text-violet-darker-ext">
                  {campaign.name}
                </span>
              )}
              <span className="label-md text-el-low">{timeAgo(item.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 cursor-pointer" onClick={onToggle}>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-el-low" />
            ) : (
              <ChevronDown className="w-4 h-4 text-el-low" />
            )}
          </div>
        </div>

        {/* Summary - always show 2-3 lines */}
        {item.summary && (
          <p className={`body-sm text-el-mid pl-[30px] cursor-pointer ${expanded ? "" : "line-clamp-3"}`} onClick={onToggle}>
            {item.summary}
          </p>
        )}

        {/* Tags + source (compact row) */}
        <div className="flex items-center gap-2 flex-wrap pl-[30px]">
          {item.tags && item.tags.split(",").slice(0, expanded ? 999 : 4).map((tag, i) => (
            <span key={i} className="flex items-center gap-0.5 label-md px-2 py-0.5 rounded-md bg-violet-lighter-ext text-violet-darker-ext">
              <Tag className="w-2.5 h-2.5" />{tag.trim()}
            </span>
          ))}
          {!expanded && item.tags && item.tags.split(",").length > 4 && (
            <span className="label-md text-el-low">+{item.tags.split(",").length - 4}</span>
          )}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 label-md text-info-base hover:text-info-dark ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="w-3 h-3" />
              <span className="truncate max-w-[180px]">
                {item.sourceUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
              </span>
            </a>
          )}
        </div>
      </div>

      {/* Expanded view - full content */}
      {expanded && (
        <div className="border-t border-outline px-5 pb-5 space-y-4">
          {/* Full content */}
          {item.content && (
            <div className="pt-4">
              <h5 className="label-md text-el-low uppercase tracking-wider mb-2">Contenido completo</h5>
              <div className="body-sm text-el-mid whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {item.content}
              </div>
            </div>
          )}

          {/* Source URL (full) */}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 body-sm text-info-base hover:text-info-dark"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.sourceUrl}</span>
            </a>
          )}

          {/* Linked prospects */}
          {linkedProspects.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Users className="w-3 h-3 text-el-low" />
                <span className="label-md text-el-low uppercase">Prospectos vinculados</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {linkedProspects.map((p) => (
                  <span key={p.id} className="label-lg px-2.5 py-1 rounded-md bg-overlay text-el-mid">
                    {p.name} <span className="text-el-low">— {p.company}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-outline">
            <button
              onClick={(e) => { e.stopPropagation(); onLinkProspects(); }}
              className="flex items-center gap-1.5 label-lg text-el-mid hover:text-violet-darker px-3 py-1.5 rounded-lg hover:bg-overlay transition cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" /> Vincular prospectos
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 label-lg text-el-mid hover:text-error-base px-3 py-1.5 rounded-lg hover:bg-overlay transition cursor-pointer ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Research Section (collapsible) ──

function NewResearchSection({ isOpen, onToggle, campaigns, onComplete, onGenerateFromNew }: {
  isOpen: boolean;
  onToggle: () => void;
  campaigns: Campaign[];
  onComplete: () => void;
  onGenerateFromNew: (newItemIds: number[]) => void;
}) {
  const [mode, setMode] = useState<"quick" | "manual" | "scout">("quick");
  // Quick research (agent)
  const [query, setQuery] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentEvents, setAgentEvents] = useState<{ phase: string; detail?: string }[]>([]);
  const [agentDone, setAgentDone] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  // Manual entry
  const [manualForm, setManualForm] = useState({
    title: "", sourceUrl: "", tags: "", summary: "", content: "", brandName: "",
    campaignId: null as number | null, category: "general",
  });
  const [savingManual, setSavingManual] = useState(false);
  // Pipeline jobs (inline status)
  const [recentJobs, setRecentJobs] = useState<ResearchJob[]>([]);
  // Track newly created research IDs from the agent run
  const [newResearchIds, setNewResearchIds] = useState<number[]>([]);
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      getResearchJobs().then((jobs) => setRecentJobs(jobs.slice(0, 5))).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [agentEvents]);

  const handleAgentRun = async () => {
    if (!query.trim()) return;
    setAgentRunning(true);
    setAgentEvents([]);
    setAgentError(null);
    setAgentDone(false);
    setNewResearchIds([]);

    // Capture research list before agent run to detect new items
    let beforeIds: number[] = [];
    try {
      const before = await getResearchList();
      beforeIds = before.map((r) => r.id);
    } catch {}

    try {
      await runResearchAgent((event) => {
        setAgentEvents((prev) => [...prev, event]);
        if (event.phase === "complete" || event.phase === "done") {
          setAgentDone(true);
        }
        if (event.phase === "error") {
          setAgentError(event.detail ?? "Error desconocido");
        }
      });
    } catch (e: any) {
      setAgentError(e.message);
    } finally {
      setAgentRunning(false);
      // Detect new research items
      try {
        const after = await getResearchList();
        const newIds = after.filter((r) => !beforeIds.includes(r.id)).map((r) => r.id);
        setNewResearchIds(newIds);
      } catch {}
    }
  };

  const handleAgentFinished = () => {
    setAgentDone(false);
    setAgentEvents([]);
    setQuery("");
    setNewResearchIds([]);
    onComplete();
  };

  const handleManualSave = async () => {
    if (!manualForm.title) return;
    setSavingManual(true);
    try {
      await createResearch(manualForm);
      setManualForm({
        title: "", sourceUrl: "", tags: "", summary: "", content: "", brandName: "",
        campaignId: null, category: "general",
      });
      onComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingManual(false);
    }
  };

  const savedCount = agentEvents.filter((e) => e.phase === "saving").length;

  return (
    <div className="border border-outline rounded-xl bg-surface">
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-overlay/50 transition rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-violet-darker" />
          <span className="title-sm text-el-high">Investigar nuevo tema</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-el-low" />
        ) : (
          <ChevronDown className="w-4 h-4 text-el-low" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-outline">
          {/* Mode toggle */}
          <div className="flex gap-1 pt-4">
            <button
              onClick={() => setMode("quick")}
              className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
                mode === "quick"
                  ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                  : "text-el-mid hover:bg-overlay"
              }`}
            >
              Investigar con AI
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
                mode === "manual"
                  ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                  : "text-el-mid hover:bg-overlay"
              }`}
            >
              Agregar manualmente
            </button>
            <button
              onClick={() => setMode("scout")}
              className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer flex items-center gap-1.5 ${
                mode === "scout"
                  ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                  : "text-el-mid hover:bg-overlay"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              Scout
            </button>
          </div>

          {mode === "scout" ? (
            <ScoutPanel onComplete={onComplete} />
          ) : mode === "quick" ? (
            <div className="space-y-3">
              {/* Agent input */}
              {!agentRunning && !agentDone && (
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAgentRun(); }}
                    placeholder="Que queres investigar? ej: estrategia de Flexport en LinkedIn"
                    className="flex-1 bg-surface-accent border border-outline rounded-lg px-4 py-2.5 body-sm text-el-high placeholder:text-el-disabled focus:outline-none focus:ring-1 focus:ring-violet-darker"
                  />
                  <button
                    onClick={handleAgentRun}
                    disabled={!query.trim()}
                    className="btn-primary contained px-5 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Investigar
                  </button>
                </div>
              )}

              {/* Agent progress (inline) */}
              {(agentRunning || agentDone || agentError) && (
                <div className="bg-overlay rounded-lg p-4 space-y-2">
                  <div ref={eventsRef} className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                    {agentEvents.map((event, i) => (
                      <div key={i} className="flex items-start gap-2 py-0.5">
                        {event.phase === "searching" && <Search className="w-3.5 h-3.5 text-info-base mt-0.5 shrink-0" />}
                        {event.phase === "saving" && <CheckCircle2 className="w-3.5 h-3.5 text-violet-darker mt-0.5 shrink-0" />}
                        {event.phase === "starting" && <Loader2 className="w-3.5 h-3.5 text-el-low mt-0.5 shrink-0 animate-spin" />}
                        {event.phase === "error" && <AlertCircle className="w-3.5 h-3.5 text-error-base mt-0.5 shrink-0" />}
                        {(event.phase === "complete" || event.phase === "done") && <CheckCircle2 className="w-3.5 h-3.5 text-violet-darker mt-0.5 shrink-0" />}
                        <span className="label-lg text-el-mid">
                          {event.phase === "starting" && event.detail}
                          {event.phase === "searching" && `Buscando: ${event.detail}`}
                          {event.phase === "saving" && `Guardado: ${event.detail}`}
                          {event.phase === "done" && event.detail}
                          {event.phase === "complete" && `${savedCount} hallazgos guardados`}
                          {event.phase === "error" && event.detail}
                        </span>
                      </div>
                    ))}
                    {agentRunning && !agentDone && (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-3.5 h-3.5 text-violet-darker animate-spin" />
                        <span className="label-lg text-el-mid">Procesando...</span>
                      </div>
                    )}
                  </div>

                  {agentError && (
                    <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-3 py-2">
                      <p className="body-sm text-error-base">{agentError}</p>
                    </div>
                  )}

                  {agentDone && (
                    <div className="space-y-3 pt-2 border-t border-outline">
                      <div className="flex items-center justify-between">
                        <p className="label-lg text-violet-darker">{savedCount} hallazgos guardados</p>
                        <button
                          onClick={handleAgentFinished}
                          className="btn-primary contained px-4 py-1.5 rounded-lg label-lg cursor-pointer"
                        >
                          Ver resultados
                        </button>
                      </div>

                      {/* Post-research CTA: generate content from new findings */}
                      {newResearchIds.length > 0 && (
                        <div className="flex items-center gap-3 bg-violet-lighter-ext/30 border border-violet-darker/20 rounded-lg px-4 py-3">
                          <Sparkles className="w-4 h-4 text-violet-darker shrink-0" />
                          <p className="body-sm text-el-mid flex-1">
                            Investigacion completada. Queres generar contenido con estos resultados?
                          </p>
                          <button
                            onClick={() => {
                              handleAgentFinished();
                              onGenerateFromNew(newResearchIds);
                            }}
                            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg label-lg transition cursor-pointer shrink-0"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generar contenido
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {agentError && !agentRunning && (
                    <button
                      onClick={() => { setAgentError(null); setAgentEvents([]); }}
                      className="label-lg text-el-mid hover:text-el-high cursor-pointer"
                    >
                      Intentar de nuevo
                    </button>
                  )}
                </div>
              )}

              {/* Recent pipeline jobs (compact) */}
              {recentJobs.length > 0 && !agentRunning && !agentDone && (
                <div>
                  <p className="label-md text-el-low uppercase tracking-wider mb-2">Investigaciones recientes</p>
                  <div className="space-y-1">
                    {recentJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-overlay">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="label-lg text-el-mid truncate">{job.niche}</span>
                          <span className="label-md text-el-low shrink-0">
                            {job.competitors.slice(0, 2).join(", ")}
                            {job.competitors.length > 2 ? ` +${job.competitors.length - 2}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <JobStatusBadge status={job.status} />
                          <span className="label-md text-el-low flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(job.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Manual entry form */
            <div className="space-y-3">
              <div>
                <label className="label-md text-el-low uppercase tracking-wider block mb-1">Titulo</label>
                <input
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
                  placeholder="ej: Analisis de estrategia Flexport"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-md text-el-low uppercase tracking-wider block mb-1">Categoria</label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
                  >
                    <option value="general">General</option>
                    <option value="competencia">Competencia</option>
                    <option value="industria">Industria</option>
                    <option value="contenido">Contenido</option>
                    <option value="prospects">Prospects</option>
                  </select>
                </div>
                <div>
                  <label className="label-md text-el-low uppercase tracking-wider block mb-1">Campana</label>
                  <select
                    value={manualForm.campaignId ?? ""}
                    onChange={(e) => setManualForm({ ...manualForm, campaignId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
                  >
                    <option value="">Sin campana</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-md text-el-low uppercase tracking-wider block mb-1">Marca</label>
                  <input
                    value={manualForm.brandName}
                    onChange={(e) => setManualForm({ ...manualForm, brandName: e.target.value })}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-md text-el-low uppercase tracking-wider block mb-1">Tags (coma)</label>
                  <input
                    value={manualForm.tags}
                    onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
                    placeholder="logistica, AI, supply chain"
                  />
                </div>
                <div>
                  <label className="label-md text-el-low uppercase tracking-wider block mb-1">URL fuente</label>
                  <input
                    value={manualForm.sourceUrl}
                    onChange={(e) => setManualForm({ ...manualForm, sourceUrl: e.target.value })}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
                  />
                </div>
              </div>
              <div>
                <label className="label-md text-el-low uppercase tracking-wider block mb-1">Resumen</label>
                <textarea
                  value={manualForm.summary}
                  onChange={(e) => setManualForm({ ...manualForm, summary: e.target.value })}
                  className="w-full bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high placeholder:text-el-disabled resize-none h-16 focus:outline-none focus:ring-1 focus:ring-violet-darker"
                />
              </div>
              <div>
                <label className="label-md text-el-low uppercase tracking-wider block mb-1">Contenido / Notas</label>
                <textarea
                  value={manualForm.content}
                  onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                  className="w-full bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high placeholder:text-el-disabled resize-none h-24 focus:outline-none focus:ring-1 focus:ring-violet-darker"
                  placeholder="Ideas, analisis, inspiracion para contenido..."
                />
              </div>
              <button
                onClick={handleManualSave}
                disabled={!manualForm.title || savingManual}
                className="btn-primary contained w-full py-2.5 rounded-md disabled:opacity-50 cursor-pointer"
              >
                {savingManual ? "Guardando..." : "Guardar investigacion"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scout Panel ──

const TOPIC_CATEGORIES = [
  { value: "competencia", label: "Competencia" },
  { value: "tendencia", label: "Tendencia" },
  { value: "mercado", label: "Mercado" },
  { value: "producto", label: "Producto" },
  { value: "general", label: "General" },
];

const INTERVAL_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 2, label: "2h" },
  { value: 5, label: "5h" },
  { value: 12, label: "12h" },
  { value: 24, label: "24h" },
];

function ScoutPanel({ onComplete }: { onComplete: () => void }) {
  const [topics, setTopics] = useState<ResearchTopicDTO[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatusDTO | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ count: number; titles: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([getResearchTopics(), getScoutSchedulerStatus()]);
      setTopics(t);
      setSchedulerStatus(s);
    } catch (e: any) {
      console.error("Scout fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll scheduler status while running
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(async () => {
      try {
        const s = await getScoutSchedulerStatus();
        setSchedulerStatus(s);
        if (!s.running) {
          setRunning(false);
          fetchAll();
          onComplete();
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [running, fetchAll, onComplete]);

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;
    try {
      await addResearchTopic(newTopic.trim(), newCategory);
      setNewTopic("");
      setNewCategory("general");
      fetchAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleTopic = async (topic: ResearchTopicDTO) => {
    await updateResearchTopic(topic.id, { enabled: !topic.enabled });
    fetchAll();
  };

  const handleDeleteTopic = async (id: number) => {
    await deleteResearchTopic(id);
    fetchAll();
  };

  const handleToggleScheduler = async () => {
    if (!schedulerStatus) return;
    try {
      if (schedulerStatus.active) {
        await stopScoutScheduler();
      } else {
        await startScoutScheduler(schedulerStatus.intervalHours || 5);
      }
      fetchAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleChangeInterval = async (hours: number) => {
    try {
      await startScoutScheduler(hours);
      fetchAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setRunResult(null);
    setError(null);
    try {
      const result = await runScoutNow();
      setRunResult(result);
      setRunning(false);
      fetchAll();
      onComplete();
    } catch (e: any) {
      setError(e.message);
      setRunning(false);
    }
  };

  // Calculate time until next run
  const nextRunLabel = useMemo(() => {
    if (!schedulerStatus?.nextRunAt) return null;
    const diff = new Date(schedulerStatus.nextRunAt).getTime() - Date.now();
    if (diff <= 0) return "ahora";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `en ${hours}h ${mins}m`;
    return `en ${mins}m`;
  }, [schedulerStatus?.nextRunAt]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-el-low animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scheduler Status Bar */}
      <div className="flex items-center justify-between bg-overlay rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <Radar className="w-4 h-4 text-violet-darker" />
          <div>
            <span className="label-lg text-el-high">
              Scout: {schedulerStatus?.active ? "activo" : "pausado"}
            </span>
            {schedulerStatus?.active && nextRunLabel && (
              <span className="label-lg text-el-low ml-2">
                — proxima busqueda {nextRunLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Interval selector */}
          <select
            value={schedulerStatus?.intervalHours || 5}
            onChange={(e) => handleChangeInterval(Number(e.target.value))}
            className="bg-surface border border-outline rounded-lg px-2 py-1 label-lg text-el-mid focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                cada {opt.label}
              </option>
            ))}
          </select>

          {/* Start/stop toggle */}
          <button
            onClick={handleToggleScheduler}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
              schedulerStatus?.active
                ? "bg-error-base/15 text-error-base hover:bg-error-base/25"
                : "bg-violet-lighter-ext text-violet-darker-ext hover:bg-violet-lighter-ext/80"
            }`}
          >
            {schedulerStatus?.active ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Activar
              </>
            )}
          </button>

          {/* Run now */}
          <button
            onClick={handleRunNow}
            disabled={running || topics.filter((t) => t.enabled).length === 0}
            className="btn-primary contained px-4 py-1.5 rounded-lg label-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Investigando...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Investigar ahora
              </>
            )}
          </button>
        </div>
      </div>

      {/* Last run info */}
      {schedulerStatus?.lastRunAt && (
        <p className="label-lg text-el-low flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Ultima ejecucion: {timeAgo(schedulerStatus.lastRunAt)}
        </p>
      )}

      {/* Run result */}
      {runResult && (
        <div className="bg-violet-lighter-ext/30 border border-violet-darker/20 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-darker" />
            <span className="label-lg text-violet-darker">
              {runResult.count} hallazgos nuevos guardados
            </span>
            <button
              onClick={() => setRunResult(null)}
              className="ml-auto text-el-low hover:text-el-high cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {runResult.titles.length > 0 && (
            <ul className="space-y-0.5">
              {runResult.titles.slice(0, 5).map((title, i) => (
                <li key={i} className="label-lg text-el-mid truncate">
                  {title}
                </li>
              ))}
              {runResult.titles.length > 5 && (
                <li className="label-lg text-el-low">
                  +{runResult.titles.length - 5} mas...
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-3 py-2 flex items-center justify-between">
          <p className="body-sm text-error-base">{error}</p>
          <button onClick={() => setError(null)} className="text-error-base cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add topic */}
      <div>
        <p className="label-md text-el-low uppercase tracking-wider mb-2">Temas de investigacion</p>
        <div className="flex gap-2">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddTopic(); }}
            placeholder='ej: "AI agents fintech LATAM", "competencia Mercado Pago"'
            className="flex-1 bg-surface-accent border border-outline rounded-lg px-4 py-2 body-sm text-el-high placeholder:text-el-disabled focus:outline-none focus:ring-1 focus:ring-violet-darker"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-surface-accent border border-outline rounded-lg px-3 py-2 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
          >
            {TOPIC_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={handleAddTopic}
            disabled={!newTopic.trim()}
            className="btn-primary contained px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      {/* Topics list */}
      {topics.length === 0 ? (
        <div className="text-center py-6">
          <p className="body-sm text-el-mid">
            No hay temas configurados. Agrega temas para que Scout investigue automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
                topic.enabled
                  ? "bg-surface border-outline"
                  : "bg-overlay border-outline/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => handleToggleTopic(topic)}
                  className="cursor-pointer shrink-0"
                  title={topic.enabled ? "Desactivar" : "Activar"}
                >
                  {topic.enabled ? (
                    <ToggleRight className="w-5 h-5 text-violet-darker" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-el-low" />
                  )}
                </button>
                <span className="label-lg text-el-high truncate">{topic.topic}</span>
                <span className="label-md text-el-low shrink-0 bg-overlay px-2 py-0.5 rounded">
                  {topic.category}
                </span>
                {topic.lastResearchedAt && (
                  <span className="label-md text-el-disabled shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(topic.lastResearchedAt)}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDeleteTopic(topic.id)}
                className="text-el-low hover:text-error-base cursor-pointer shrink-0 ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-overlay text-el-mid",
    running: "bg-info-base/15 text-info-base",
    completed: "bg-success-base/15 text-success-base",
    failed: "bg-error-base/15 text-error-base",
  };
  return (
    <span className={`label-md px-2 py-0.5 rounded-md ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

// ── Link Prospects Modal (kept as-is) ──

function LinkProspectsModal({ researchId, onClose }: {
  researchId: number;
  onClose: () => void;
}) {
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getProspects(),
      getResearchProspects(researchId),
    ]).then(([all, linked]) => {
      setAllProspects(all);
      setSelected(new Set(linked.map((p) => p.id)));
      setLoading(false);
    });
  }, [researchId]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    await linkResearchProspects(researchId, Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-outline rounded-xl w-full max-w-md p-6 space-y-4 shadow-high max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="title-lg text-el-high">Vincular Prospectos</h3>
          <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="text-center text-el-low body-sm py-10">Cargando...</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            {allProspects.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                  selected.has(p.id) ? "bg-violet-lighter-ext/40" : "hover:bg-overlay"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="accent-violet-darker"
                />
                <div className="flex-1 min-w-0">
                  <span className="body-sm text-el-high">{p.name}</span>
                  <span className="label-lg text-el-low ml-2">{p.company}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary contained w-full py-2.5 rounded-md disabled:opacity-50"
        >
          {saving ? "Guardando..." : `Vincular ${selected.size} prospecto${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
