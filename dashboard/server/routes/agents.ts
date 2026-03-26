// ── Agent API routes ──
// GET  /api/agents         — current state of all agents
// POST /api/agents/command  — send a command to Eddie
// GET  /api/agents/activity — recent activity log

import { Router } from "express";
import { getAllAgents, getActivityLog } from "../agents/agent-state.js";
import { runEddieCommand } from "../agents/eddie-agent.js";

const router = Router();

// ── GET /api/agents — returns snapshot of all agent states ──
router.get("/", (_req, res) => {
  res.json(getAllAgents());
});

// ── GET /api/agents/activity — recent activity entries ──
router.get("/activity", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  res.json(getActivityLog(limit));
});

// ── POST /api/agents/command — send a high-level command to Eddie ──
// Streams results back as SSE.
router.post("/command", async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command || !command.trim()) {
    return res.status(400).json({ error: "command is required" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await runEddieCommand(command.trim(), (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: "error", content: e.message })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
