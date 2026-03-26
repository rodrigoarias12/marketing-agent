// ── SSE endpoint for real-time agent state updates ──
// GET /api/agents/stream

import { Router } from "express";
import { subscribe, getAllAgents } from "../agents/agent-state.js";

const router = Router();

router.get("/stream", (req, res) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // nginx compat

  // Send initial snapshot
  res.write(`event: snapshot\ndata: ${JSON.stringify(getAllAgents())}\n\n`);

  // Subscribe to changes
  const unsubscribe = subscribe((event: string, data: unknown) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Connection likely closed
      unsubscribe();
    }
  });

  // Heartbeat every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      unsubscribe();
    }
  }, 15_000);

  // Cleanup on close
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
