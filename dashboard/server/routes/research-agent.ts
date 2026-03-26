import { Router } from "express";
import { runResearchAgent } from "../lib/research-agent.js";

const router = Router();

// POST /api/research/agent/run — trigger research agent with SSE streaming
router.post("/agent/run", async (req, res) => {
  const { configIds } = req.body as { configIds?: number[] };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = await runResearchAgent(
      (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      { configIds }
    );

    res.write(`data: ${JSON.stringify({ phase: "complete", count: result.count, titles: result.titles })}\n\n`);
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ phase: "error", detail: e.message })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
