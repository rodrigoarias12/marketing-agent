import { useState, useEffect, useRef } from "react";
import {
  X, Rocket, Loader2, CheckCircle2, AlertCircle, Search,
  Brain, FileText, Lightbulb, Save, ChevronDown, ChevronUp,
  Clock, ExternalLink, Calendar, Send,
} from "lucide-react";
import {
  startResearchPipeline, getResearchJobs, getResearchJobDetail,
  streamResearchJob,
} from "../../api/client";
import type { ResearchJob, ResearchJobDetail, PipelineProgressEvent } from "../../types";

const STEP_ICONS: Record<string, typeof Search> = {
  planning: Brain,
  searching: Search,
  extracting: FileText,
  analyzing: Brain,
  generating: Lightbulb,
  saving: Save,
  complete: CheckCircle2,
  error: AlertCircle,
};

const STEP_LABELS: Record<string, string> = {
  planning: "Planning Queries",
  searching: "Searching Web",
  extracting: "Extracting Content",
  analyzing: "Analyzing Competitors",
  generating: "Generating Ideas",
  saving: "Saving Results",
  complete: "Complete",
  error: "Error",
};

const PIPELINE_STEPS = ["planning", "searching", "extracting", "analyzing", "generating", "saving"];

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "blog", label: "Blog" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
];

export function ResearchPipelinePanel({ onClose, onComplete }: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [tab, setTab] = useState<"new" | "jobs">("new");

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-outline rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-high max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-green-darker" />
            <h3 className="title-lg text-el-high">Research Pipeline</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-overlay rounded-lg p-0.5">
              <button
                onClick={() => setTab("new")}
                className={`px-3 py-1 rounded-md label-lg transition cursor-pointer ${
                  tab === "new" ? "bg-surface text-el-high shadow-sm" : "text-el-mid"
                }`}
              >
                New Run
              </button>
              <button
                onClick={() => setTab("jobs")}
                className={`px-3 py-1 rounded-md label-lg transition cursor-pointer ${
                  tab === "jobs" ? "bg-surface text-el-high shadow-sm" : "text-el-mid"
                }`}
              >
                History
              </button>
            </div>
            <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {tab === "new" ? (
          <NewRunForm onComplete={onComplete} />
        ) : (
          <JobHistory onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

// ── New Run Form ──

function NewRunForm({ onComplete }: { onComplete: () => void }) {
  const [niche, setNiche] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(["linkedin", "x"]);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PipelineProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll events
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [events]);

  const addCompetitor = () => {
    const trimmed = competitorInput.trim();
    if (trimmed && !competitors.includes(trimmed)) {
      setCompetitors([...competitors, trimmed]);
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (name: string) => {
    setCompetitors(competitors.filter((c) => c !== name));
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleRun = async () => {
    if (!niche || competitors.length === 0) return;
    setRunning(true);
    setEvents([]);
    setError(null);
    setDone(false);

    try {
      const { jobId } = await startResearchPipeline({ niche, competitors, platforms });
      setActiveJobId(jobId);

      // Subscribe to SSE stream
      const cancel = streamResearchJob(jobId, (event) => {
        setEvents((prev) => [...prev, event]);
        if (event.step === "complete") {
          setDone(true);
          setRunning(false);
        }
        if (event.step === "error") {
          setError(event.detail);
          setRunning(false);
        }
      });

      // Cleanup on unmount would go here but we let it run
    } catch (err: any) {
      setError(err.message);
      setRunning(false);
    }
  };

  const lastEvent = events[events.length - 1];
  const currentProgress = lastEvent?.progress ?? 0;
  const currentStepIndex = lastEvent ? PIPELINE_STEPS.indexOf(lastEvent.step) : -1;

  if (!running && !done && !error) {
    return (
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        {/* Niche */}
        <div>
          <label className="label-md text-el-low uppercase tracking-wider block mb-1">Niche / Industry</label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-green-darker"
            placeholder="e.g. AI-powered logistics, SaaS marketing tools"
          />
        </div>

        {/* Competitors */}
        <div>
          <label className="label-md text-el-low uppercase tracking-wider block mb-1">Competitors</label>
          <div className="flex gap-2">
            <input
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
              className="flex-1 bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-green-darker"
              placeholder="Type a competitor name and press Enter"
            />
            <button
              onClick={addCompetitor}
              disabled={!competitorInput.trim()}
              className="btn-primary outlined px-4 py-2 rounded-md disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {competitors.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 label-lg px-2.5 py-1 rounded-md bg-green-lighter-ext text-green-darker-ext"
                >
                  {c}
                  <button
                    onClick={() => removeCompetitor(c)}
                    className="hover:text-error-base cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Platforms */}
        <div>
          <label className="label-md text-el-low uppercase tracking-wider block mb-1">Target Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => togglePlatform(p.value)}
                className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
                  platforms.includes(p.value)
                    ? "bg-green-lighter-ext text-green-darker-ext ring-1 ring-green-darker/30"
                    : "bg-overlay text-el-mid hover:text-el-high"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!niche || competitors.length === 0}
          className="btn-primary contained w-full py-2.5 rounded-md disabled:opacity-50 cursor-pointer"
        >
          <Rocket className="w-4 h-4 inline mr-2" />
          Run Research Pipeline
        </button>
      </div>
    );
  }

  // Running / Done / Error state
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {PIPELINE_STEPS.map((step, i) => {
          const Icon = STEP_ICONS[step] || Search;
          const isActive = lastEvent?.step === step;
          const isCompleted = currentStepIndex > i || done;
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isCompleted ? "bg-green-darker text-white" :
                isActive ? "bg-green-lighter-ext text-green-darker ring-2 ring-green-darker" :
                "bg-overlay text-el-disabled"
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive && running ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className={`label-md ${isActive || isCompleted ? "text-el-high" : "text-el-disabled"}`}>
                {STEP_LABELS[step]?.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-overlay rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-green-darker rounded-full transition-all duration-500"
          style={{ width: `${currentProgress}%` }}
        />
      </div>

      {/* Events log */}
      <div ref={eventsRef} className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar min-h-0">
        {events.map((event, i) => {
          const Icon = STEP_ICONS[event.step] || Search;
          return (
            <div key={i} className="flex items-start gap-2 py-1">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                event.step === "error" ? "text-error-base" :
                event.step === "complete" ? "text-green-darker" :
                "text-info-base"
              }`} />
              <span className="label-lg text-el-mid">{event.detail}</span>
            </div>
          );
        })}
        {running && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 text-green-darker animate-spin" />
            <span className="body-sm text-el-mid">Processing...</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-4 py-3 mt-3">
          <p className="body-sm text-error-base">{error}</p>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="space-y-3 pt-3 border-t border-outline mt-3">
          <div className="text-center">
            <p className="title-sm text-green-darker">Pipeline Complete!</p>
            <p className="label-lg text-el-low mt-1">Results saved to Research section</p>
          </div>
          {activeJobId && <JobResultsPreview jobId={activeJobId} />}
          <button
            onClick={() => { onComplete(); }}
            className="btn-primary contained w-full py-2.5 rounded-md cursor-pointer"
          >
            View Results
          </button>
        </div>
      )}
    </div>
  );
}

// ── Job Results Preview ──

function JobResultsPreview({ jobId }: { jobId: number }) {
  const [detail, setDetail] = useState<ResearchJobDetail | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getResearchJobDetail(jobId).then(setDetail).catch(() => {});
  }, [jobId]);

  if (!detail) return null;

  const analysisResult = detail.results.find((r) => r.type === "analysis");
  const ideasResult = detail.results.find((r) => r.type === "content_ideas");
  const ideas = ideasResult?.data?.contentIdeas || [];

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
      {/* Analysis preview */}
      {analysisResult && (
        <div className="bg-overlay rounded-lg p-3">
          <button
            onClick={() => setExpanded(expanded === "analysis" ? null : "analysis")}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <span className="label-lg text-el-high flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-info-base" /> Analysis
            </span>
            {expanded === "analysis" ? <ChevronUp className="w-3.5 h-3.5 text-el-low" /> : <ChevronDown className="w-3.5 h-3.5 text-el-low" />}
          </button>
          {expanded === "analysis" && (
            <p className="body-sm text-el-mid mt-2 whitespace-pre-wrap">
              {analysisResult.data.analysis?.substring(0, 1000)}
              {(analysisResult.data.analysis?.length || 0) > 1000 ? "..." : ""}
            </p>
          )}
        </div>
      )}

      {/* Content ideas */}
      {ideas.length > 0 && (
        <div className="bg-overlay rounded-lg p-3">
          <button
            onClick={() => setExpanded(expanded === "ideas" ? null : "ideas")}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <span className="label-lg text-el-high flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-warning-dark" /> {ideas.length} Content Ideas
            </span>
            {expanded === "ideas" ? <ChevronUp className="w-3.5 h-3.5 text-el-low" /> : <ChevronDown className="w-3.5 h-3.5 text-el-low" />}
          </button>
          {expanded === "ideas" && (
            <div className="mt-2 space-y-2">
              {ideas.map((idea: any, i: number) => (
                <div key={i} className="bg-surface rounded-md p-2.5 border border-outline">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="label-lg text-el-high">{idea.title}</h5>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="label-md px-1.5 py-0.5 rounded bg-green-lighter-ext text-green-darker-ext">
                        {idea.format}
                      </span>
                      <span className="label-md px-1.5 py-0.5 rounded bg-overlay text-el-mid">
                        {idea.platform}
                      </span>
                    </div>
                  </div>
                  <p className="label-md text-el-low mt-1">{idea.description}</p>
                  {idea.suggestedDate && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Calendar className="w-3 h-3 text-el-disabled" />
                      <span className="label-md text-el-disabled">{idea.suggestedDate}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Job History ──

function JobHistory({ onComplete }: { onComplete: () => void }) {
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  useEffect(() => {
    getResearchJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center text-el-low body-sm py-10">Loading jobs...</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <Search className="w-10 h-10 text-el-disabled mx-auto" />
        <p className="body-sm text-el-mid">No pipeline runs yet</p>
        <p className="label-lg text-el-low">Start a new run to see results here</p>
      </div>
    );
  }

  if (selectedJob) {
    return <JobDetailView jobId={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
      {jobs.map((job) => (
        <button
          key={job.id}
          onClick={() => setSelectedJob(job.id)}
          className="w-full bg-overlay hover:bg-surface-accent rounded-lg p-3 text-left transition cursor-pointer border border-transparent hover:border-outline"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="label-lg text-el-high">{job.niche}</span>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex items-center gap-3 label-md text-el-low">
            <span>{job.competitors.join(", ")}</span>
            <span className="text-el-disabled">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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

function JobDetailView({ jobId, onBack }: { jobId: number; onBack: () => void }) {
  const [detail, setDetail] = useState<ResearchJobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResearchJobDetail(jobId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return <div className="text-center text-el-low body-sm py-10">Loading...</div>;
  }

  if (!detail) {
    return <div className="text-center text-el-low body-sm py-10">Job not found</div>;
  }

  const analysisResult = detail.results.find((r) => r.type === "analysis");
  const ideasResult = detail.results.find((r) => r.type === "content_ideas");
  const searchResult = detail.results.find((r) => r.type === "search");
  const ideas = ideasResult?.data?.contentIdeas || [];

  return (
    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
      <button onClick={onBack} className="label-lg text-el-mid hover:text-el-high cursor-pointer">
        &larr; Back to History
      </button>

      <div className="bg-overlay rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="title-sm text-el-high">{detail.niche}</h4>
          <StatusBadge status={detail.status} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detail.competitors.map((c) => (
            <span key={c} className="label-lg px-2 py-0.5 rounded-md bg-green-lighter-ext text-green-darker-ext">{c}</span>
          ))}
        </div>
        <div className="flex gap-3 label-md text-el-low">
          <span>Started: {new Date(detail.createdAt).toLocaleString()}</span>
          {detail.completedAt && <span>Completed: {new Date(detail.completedAt).toLocaleString()}</span>}
        </div>
        {detail.error && (
          <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-3 py-2 mt-2">
            <p className="body-sm text-error-base">{detail.error}</p>
          </div>
        )}
      </div>

      {/* Search results summary */}
      {searchResult && (
        <div className="bg-overlay rounded-lg p-3">
          <h5 className="label-md text-el-low uppercase mb-2">Search Results</h5>
          <p className="label-lg text-el-mid">
            {searchResult.data.searchResults?.length || 0} queries executed,{" "}
            {searchResult.data.searchResults?.reduce((s: number, r: any) => s + (r.urls?.length || 0), 0) || 0} URLs found
          </p>
        </div>
      )}

      {/* Analysis */}
      {analysisResult && (
        <div className="bg-overlay rounded-lg p-4">
          <h5 className="label-md text-el-low uppercase mb-2">Competitive Analysis</h5>
          <div className="body-sm text-el-mid whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar">
            {analysisResult.data.analysis}
          </div>
        </div>
      )}

      {/* Content ideas */}
      {ideas.length > 0 && (
        <div className="space-y-2">
          <h5 className="label-md text-el-low uppercase">Content Ideas ({ideas.length})</h5>
          {ideas.map((idea: any, i: number) => (
            <div key={i} className="bg-overlay rounded-lg p-3 border border-outline">
              <div className="flex items-start justify-between gap-2">
                <h5 className="label-lg text-el-high">{idea.title}</h5>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="label-md px-1.5 py-0.5 rounded bg-green-lighter-ext text-green-darker-ext">
                    {idea.format}
                  </span>
                  <span className="label-md px-1.5 py-0.5 rounded bg-surface text-el-mid">
                    {idea.platform}
                  </span>
                </div>
              </div>
              <p className="body-sm text-el-mid mt-1.5">{idea.description}</p>
              {idea.suggestedDate && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Calendar className="w-3 h-3 text-el-disabled" />
                  <span className="label-md text-el-disabled">{idea.suggestedDate}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
