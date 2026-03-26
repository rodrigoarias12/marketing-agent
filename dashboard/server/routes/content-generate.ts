import { Router } from "express";
import { generateContentFromResearch } from "../lib/content-generator.js";

const router = Router();

// POST /api/content/generate — generate content from research
router.post("/generate", async (req, res) => {
  const { date, researchIds, platforms, postCount } = req.body as {
    date: string;
    researchIds?: number[];
    platforms?: string[];
    postCount?: number;
  };

  if (!date) {
    return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
  }

  try {
    const result = await generateContentFromResearch({
      date,
      researchIds,
      platforms,
      postCount,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
