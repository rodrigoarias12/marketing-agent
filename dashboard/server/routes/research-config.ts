import { Router } from "express";
import type { SQLInputValue } from "node:sqlite";
import { db } from "../db.js";
import { toCamel, toCamelArray, toSnake } from "../lib/case-convert.js";
import { logActivity } from "../lib/activity.js";
import {
  startResearchScheduler,
  stopResearchScheduler,
  getSchedulerStatus,
  runResearchNow,
} from "../lib/research-scheduler.js";

const router = Router();

// GET all configs, optionally filtered by type
router.get("/", (req, res) => {
  let sql = "SELECT * FROM research_config WHERE 1=1";
  const params: string[] = [];

  if (req.query.type) {
    sql += " AND type = ?";
    params.push(String(req.query.type));
  }

  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// GET single
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM research_config WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(toCamel(row as Record<string, unknown>));
});

// POST create
router.post("/", (req, res) => {
  const b = toSnake(req.body);
  const result = db.prepare(
    `INSERT INTO research_config (type, name, url, description, enabled)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    String(b.type ?? "competitor"),
    String(b.name ?? ""),
    String(b.url || ""),
    String(b.description || ""),
    b.enabled === false ? 0 : 1
  );
  const created = db.prepare("SELECT * FROM research_config WHERE id = ?").get(result.lastInsertRowid);
  logActivity("create", "research_config", String(result.lastInsertRowid), `Config: ${b.name} (${b.type})`);
  res.status(201).json(toCamel(created as Record<string, unknown>));
});

// PUT update
router.put("/:id", (req, res) => {
  const b = toSnake(req.body);
  const fields: string[] = [];
  const values: SQLInputValue[] = [];

  for (const [key, val] of Object.entries(b)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = ?`);
    if (key === "enabled") {
      values.push(val ? 1 : 0);
    } else {
      values.push(val == null ? "" : String(val));
    }
  }
  fields.push("updated_at = datetime('now')");
  values.push(Number(req.params.id));

  db.prepare(`UPDATE research_config SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM research_config WHERE id = ?").get(Number(req.params.id));
  res.json(toCamel(updated as Record<string, unknown>));
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM research_config WHERE id = ?").run(Number(req.params.id));
  res.json({ success: true });
});

// ══════════════════════════════════════════════════
// ── Research Topics (Scout) ──
// ══════════════════════════════════════════════════

// GET all topics
router.get("/topics", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM research_topics ORDER BY created_at DESC")
    .all();
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// POST create topic
router.post("/topics", (req, res) => {
  const { topic, category } = req.body;
  if (!topic) return res.status(400).json({ error: "topic is required" });

  const result = db
    .prepare(
      "INSERT INTO research_topics (topic, category, enabled) VALUES (?, ?, 1)"
    )
    .run(String(topic), String(category || "general"));
  const created = db
    .prepare("SELECT * FROM research_topics WHERE id = ?")
    .get(result.lastInsertRowid);
  logActivity(
    "create",
    "research_topic",
    String(result.lastInsertRowid),
    `Scout topic: ${topic} (${category || "general"})`
  );
  res.status(201).json(toCamel(created as Record<string, unknown>));
});

// PUT update topic
router.put("/topics/:id", (req, res) => {
  const b = toSnake(req.body);
  const fields: string[] = [];
  const values: SQLInputValue[] = [];

  for (const [key, val] of Object.entries(b)) {
    if (key === "id" || key === "created_at") continue;
    fields.push(`${key} = ?`);
    if (key === "enabled") {
      values.push(val ? 1 : 0);
    } else {
      values.push(val == null ? "" : String(val));
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: "No fields" });

  values.push(Number(req.params.id));
  db.prepare(
    `UPDATE research_topics SET ${fields.join(", ")} WHERE id = ?`
  ).run(...values);
  const updated = db
    .prepare("SELECT * FROM research_topics WHERE id = ?")
    .get(Number(req.params.id));
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(toCamel(updated as Record<string, unknown>));
});

// DELETE topic
router.delete("/topics/:id", (req, res) => {
  db.prepare("DELETE FROM research_topics WHERE id = ?").run(
    Number(req.params.id)
  );
  res.json({ success: true });
});

// ══════════════════════════════════════════════════
// ── Scheduler (Scout) ──
// ══════════════════════════════════════════════════

// GET scheduler status
router.get("/scheduler/status", (_req, res) => {
  res.json(getSchedulerStatus());
});

// POST start scheduler
router.post("/scheduler/start", (req, res) => {
  const intervalHours = Number(req.body.intervalHours) || 5;
  startResearchScheduler(intervalHours);
  res.json({ success: true, ...getSchedulerStatus() });
});

// POST stop scheduler
router.post("/scheduler/stop", (_req, res) => {
  stopResearchScheduler();
  res.json({ success: true, ...getSchedulerStatus() });
});

// POST run research now (manual trigger)
router.post("/run-now", async (_req, res) => {
  try {
    const result = await runResearchNow();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

export default router;
