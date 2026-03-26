import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

// Load .env — try marketing-agent/.env first, then openclaw-team/.env
const envCandidates = [
  resolve(import.meta.dirname, "../../.env"),       // marketing-agent/.env
  resolve(import.meta.dirname, "../../../.env"),     // openclaw-team/workspaces/.env (unlikely)
  resolve(import.meta.dirname, "../../../../.env"),  // openclaw-team/.env
];
const envPath = envCandidates.find(p => existsSync(p)) || envCandidates[0]!;
const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.warn("⚠️  Failed to load .env:", result.error.message);
} else {
  console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} env vars from ${envPath}`);
}

import express from "express";
import cors from "cors";

import contentRoutes from "./routes/content.js";
import prospectsRoutes from "./routes/prospects.js";
import researchRoutes from "./routes/research.js";
import publishRoutes from "./routes/publish.js";
import campaignsRoutes from "./routes/campaigns.js";
import dashboardRoutes from "./routes/dashboard.js";
import chatRoutes from "./routes/chat.js";
import researchConfigRoutes from "./routes/research-config.js";
import researchAgentRoutes from "./routes/research-agent.js";
import contentGenerateRoutes from "./routes/content-generate.js";
import contentCarouselRoutes from "./routes/content-carousel.js";
import researchPipelineRoutes from "./routes/research-pipeline.js";
import agentsRoutes from "./routes/agents.js";
import agentsSseRoutes from "./routes/agents-sse.js";
import { startResearchScheduler } from "./lib/research-scheduler.js";

const PORT = Number(process.env.API_PORT) || 5679;
const app = express();

// ── Middleware ──
app.use(cors({ origin: true }));
app.use(express.json());

// ── Static: serve images from content/images ──
const imagesDir = resolve(import.meta.dirname, "../../content/images");
app.use("/static/images", express.static(imagesDir));

// ── API Routes ──
app.use("/api", contentRoutes);           // /api/drafts, /api/images, /api/published
app.use("/api/prospects", prospectsRoutes); // /api/prospects CRUD
app.use("/api/research", researchRoutes);   // /api/research CRUD
app.use("/api/publish", publishRoutes);     // POST /api/publish, GET /api/publish/status/:date
app.use("/api/campaigns", campaignsRoutes); // /api/campaigns CRUD
app.use("/api/dashboard", dashboardRoutes); // /api/dashboard KPIs, activity, pending
app.use("/api/chat", chatRoutes);             // POST /api/chat streaming
app.use("/api/research-config", researchConfigRoutes); // Research config CRUD
app.use("/api/research", researchAgentRoutes);  // Research agent run
app.use("/api/content", contentGenerateRoutes); // Content generation
app.use("/api/content", contentCarouselRoutes); // Carousel preview
app.use("/api/research-pipeline", researchPipelineRoutes); // Research pipeline run/jobs
app.use("/api/agents", agentsRoutes);            // Agent state + commands
app.use("/api/agents", agentsSseRoutes);         // Agent SSE stream

// ── Health check ──
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Scout: auto-start research scheduler ──
if (process.env.GEMINI_API_KEY) {
  startResearchScheduler(5); // Every 5 hours
}

// ── Start ──
app.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  🚀 Eddie Dashboard API running at http://127.0.0.1:${PORT}\n`);
});
