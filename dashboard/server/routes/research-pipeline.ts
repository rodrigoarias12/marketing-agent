import { Router } from "express";
import { db } from "../db.js";
import { toCamel, toCamelArray } from "../lib/case-convert.js";
import { runResearchPipeline } from "../agents/research-pipeline.js";
import type { PipelineInput } from "../agents/research-pipeline.js";

const router = Router();

// In-memory store for SSE connections per job
const jobListeners = new Map<number, Set<(event: string) => void>>();

// POST /api/research-pipeline/run — Trigger a new research pipeline job
router.post("/run", async (req, res) => {
  const { niche, competitors, platforms } = req.body as PipelineInput;

  if (!niche || !Array.isArray(competitors) || competitors.length === 0) {
    return res.status(400).json({
      error: "niche (string) and competitors (string[]) are required",
    });
  }

  const safePlatforms = Array.isArray(platforms) && platforms.length > 0
    ? platforms
    : ["linkedin", "x"];

  // Create the job in the database
  const result = db.prepare(
    `INSERT INTO research_jobs (niche, competitors, platforms, status)
     VALUES (?, ?, ?, 'running')`
  ).run(niche, JSON.stringify(competitors), JSON.stringify(safePlatforms));

  const jobId = Number(result.lastInsertRowid);

  // Run pipeline asynchronously (don't await)
  runResearchPipeline(
    jobId,
    { niche, competitors, platforms: safePlatforms },
    (event) => {
      // Broadcast to any SSE listeners
      const listeners = jobListeners.get(jobId);
      if (listeners) {
        const data = JSON.stringify(event);
        for (const send of listeners) {
          send(data);
        }
      }
    }
  ).catch((err) => {
    console.error(`[Research Pipeline] Job ${jobId} failed:`, err.message);
  });

  res.status(201).json({ jobId, status: "running" });
});

// GET /api/research-pipeline/jobs — List all research pipeline jobs
router.get("/jobs", (_req, res) => {
  const rows = db.prepare(
    "SELECT * FROM research_jobs ORDER BY created_at DESC LIMIT 50"
  ).all();
  res.json(toCamelArray(rows as Record<string, unknown>[]).map((row: any) => ({
    ...row,
    competitors: tryParseJSON(row.competitors, []),
    platforms: tryParseJSON(row.platforms, []),
  })));
});

// GET /api/research-pipeline/jobs/:id — Get a specific job with its results
router.get("/jobs/:id", (req, res) => {
  const jobId = Number(req.params.id);
  const job = db.prepare("SELECT * FROM research_jobs WHERE id = ?").get(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const results = db.prepare(
    "SELECT * FROM research_results WHERE job_id = ? ORDER BY created_at ASC"
  ).all(jobId);

  const camelJob = toCamel(job as Record<string, unknown>) as any;
  camelJob.competitors = tryParseJSON(camelJob.competitors, []);
  camelJob.platforms = tryParseJSON(camelJob.platforms, []);

  const camelResults = toCamelArray(results as Record<string, unknown>[]).map((r: any) => ({
    ...r,
    data: tryParseJSON(r.data, {}),
  }));

  res.json({ ...camelJob, results: camelResults });
});

// GET /api/research-pipeline/jobs/:id/stream — SSE stream for job progress
router.get("/jobs/:id/stream", (req, res) => {
  const jobId = Number(req.params.id);
  const job = db.prepare("SELECT status FROM research_jobs WHERE id = ?").get(jobId) as { status: string } | undefined;

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  // If already complete or failed, send final status immediately
  if (job.status === "completed" || job.status === "failed") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ step: job.status === "completed" ? "complete" : "error", detail: job.status === "completed" ? "Pipeline already completed" : "Pipeline failed", progress: job.status === "completed" ? 100 : 0 })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: string) => {
    res.write(`data: ${data}\n\n`);
    // Check if pipeline is done
    try {
      const parsed = JSON.parse(data);
      if (parsed.step === "complete" || parsed.step === "error") {
        setTimeout(() => {
          res.write("data: [DONE]\n\n");
          res.end();
          cleanup();
        }, 100);
      }
    } catch {}
  };

  // Register listener
  if (!jobListeners.has(jobId)) {
    jobListeners.set(jobId, new Set());
  }
  jobListeners.get(jobId)!.add(send);

  const cleanup = () => {
    const set = jobListeners.get(jobId);
    if (set) {
      set.delete(send);
      if (set.size === 0) jobListeners.delete(jobId);
    }
  };

  // Clean up on disconnect
  req.on("close", cleanup);
  req.on("error", cleanup);

  // Send a keepalive comment
  res.write(": connected\n\n");
});

function tryParseJSON(str: unknown, fallback: unknown): unknown {
  if (typeof str !== "string") return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default router;
