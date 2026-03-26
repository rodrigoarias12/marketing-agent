import { db } from "../db.js";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let currentIntervalHours = 5;
let lastRunAt: string | null = null;
let nextRunAt: string | null = null;

export function startResearchScheduler(intervalHours: number = 5) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  currentIntervalHours = intervalHours;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Calculate next run time
  nextRunAt = new Date(Date.now() + intervalMs).toISOString();

  console.log(
    `[Scout] Research scheduler started — runs every ${intervalHours}h`
  );

  schedulerInterval = setInterval(async () => {
    if (isRunning) {
      console.log("[Scout] Already running, skipping...");
      return;
    }

    isRunning = true;
    console.log("[Scout] Starting scheduled research...");

    try {
      const { runGeminiResearch } = await import("./gemini-research.js");
      const result = await runGeminiResearch((msg) =>
        console.log(`[Scout] ${msg}`)
      );
      console.log(`[Scout] Done: ${result.count} new findings`);
      lastRunAt = new Date().toISOString();
    } catch (err: any) {
      console.error(`[Scout] Error: ${err.message}`);
    } finally {
      isRunning = false;
      nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    }
  }, intervalMs);

  // Also run immediately on start (after 30 seconds delay)
  setTimeout(async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.log("[Scout] GEMINI_API_KEY not set, scheduler paused");
      return;
    }

    // Check if topics exist
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='research_topics'"
      )
      .get();
    if (!tableExists) {
      console.log("[Scout] No research_topics table yet, skipping initial run");
      return;
    }
    const count = db
      .prepare(
        "SELECT COUNT(*) as c FROM research_topics WHERE enabled = 1"
      )
      .get() as { c: number };
    if (count.c === 0) {
      console.log("[Scout] No active topics configured, skipping initial run");
      return;
    }

    isRunning = true;
    try {
      const { runGeminiResearch } = await import("./gemini-research.js");
      const result = await runGeminiResearch((msg) =>
        console.log(`[Scout] ${msg}`)
      );
      console.log(`[Scout] Initial run done: ${result.count} new findings`);
      lastRunAt = new Date().toISOString();
    } catch (err: any) {
      console.error(`[Scout] Initial run error: ${err.message}`);
    } finally {
      isRunning = false;
    }
  }, 30_000);
}

export function stopResearchScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    nextRunAt = null;
    console.log("[Scout] Research scheduler stopped");
  }
}

export function getSchedulerStatus() {
  return {
    active: schedulerInterval !== null,
    running: isRunning,
    intervalHours: currentIntervalHours,
    lastRunAt,
    nextRunAt,
  };
}

export async function runResearchNow(): Promise<{
  count: number;
  titles: string[];
}> {
  if (isRunning) {
    throw new Error("Ya hay una investigacion en curso");
  }

  isRunning = true;
  try {
    const { runGeminiResearch } = await import("./gemini-research.js");
    const result = await runGeminiResearch((msg) =>
      console.log(`[Scout] ${msg}`)
    );
    lastRunAt = new Date().toISOString();
    return result;
  } finally {
    isRunning = false;
  }
}
