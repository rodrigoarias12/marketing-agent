import { Router } from "express";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { WORKSPACE, db } from "../db.js";

const router = Router();
const CONTENT = join(WORKSPACE, "content");

// List all draft dates
router.get("/drafts", async (_req, res) => {
  try {
    const draftsDir = join(CONTENT, "drafts");
    const files = await readdir(draftsDir);
    const dates = files
      .filter((f) => f.endsWith(".md") && /^\d{4}-\d{2}-\d{2}/.test(f))
      .map((f) => f.replace(".md", ""))
      .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))
      .sort()
      .reverse();

    const result = [];
    for (const date of dates) {
      try {
        const { parseDrafts } = await import(join(WORKSPACE, "scripts", "lib", "parse-drafts.mjs"));
        const posts = await parseDrafts(date);
        result.push({ date, postCount: posts.length });
      } catch {
        result.push({ date, postCount: 0 });
      }
    }
    res.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// Get parsed posts for a date — merges content_status info
router.get("/drafts/:date", async (req, res) => {
  try {
    const { parseDrafts } = await import(join(WORKSPACE, "scripts", "lib", "parse-drafts.mjs"));
    const posts = await parseDrafts(req.params.date);

    // Get content_status for this date
    const statuses = db.prepare(
      "SELECT * FROM content_status WHERE date = ?"
    ).all(req.params.date) as Record<string, unknown>[];

    // Merge status info into each post
    const enriched = posts.map((post: any) => {
      const statusRow = statuses.find(
        (s: any) => s.post_number === post.number
      ) as Record<string, unknown> | undefined;

      return {
        ...post,
        statusInfo: statusRow
          ? {
              status: statusRow.status,
              publishedAt: statusRow.published_at,
              publishedUrl: statusRow.published_url,
              approvedAt: statusRow.approved_at,
              bodyOverride: statusRow.body_override,
              notes: statusRow.notes,
            }
          : null,
      };
    });

    res.json(enriched);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(404).json({ error: msg });
  }
});

// List images for a date
router.get("/images/:date", async (req, res) => {
  try {
    const imagesDir = join(CONTENT, "images", req.params.date);
    const files = await readdir(imagesDir);
    res.json(files.filter((f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg")));
  } catch {
    res.json([]);
  }
});

// Serve a specific image by post number prefix
router.get("/images/:date/:postPrefix", async (req, res) => {
  try {
    const imagesDir = join(CONTENT, "images", req.params.date);
    const files = await readdir(imagesDir);
    const prefix = req.params.postPrefix.padStart(2, "0");
    const match = files.find((f) => f.startsWith(prefix) && (f.endsWith(".png") || f.endsWith(".jpg")));
    if (match) {
      const filePath = join(imagesDir, match);
      const s = await stat(filePath);
      const ext = match.endsWith(".png") ? "image/png" : "image/jpeg";
      res.setHeader("Content-Type", ext);
      res.setHeader("Content-Length", s.size);
      const data = await readFile(filePath);
      res.send(data);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch {
    res.status(404).json({ error: "Image not found" });
  }
});

// List published content
router.get("/published", async (_req, res) => {
  try {
    const pubDir = join(CONTENT, "published");
    const files = await readdir(pubDir);
    const result = [];
    for (const f of files.filter((f) => f.endsWith(".md"))) {
      const content = await readFile(join(pubDir, f), "utf-8");
      result.push({ date: f.replace(".md", ""), content });
    }
    res.json(result.sort((a, b) => b.date.localeCompare(a.date)));
  } catch {
    res.json([]);
  }
});

export default router;
