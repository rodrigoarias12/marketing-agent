import { Router } from "express";
import type { SQLInputValue } from "node:sqlite";
import { db } from "../db.js";
import { toCamel, toCamelArray, toSnake } from "../lib/case-convert.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// GET all research entries with filters
router.get("/", (_req, res) => {
  let sql = "SELECT * FROM research WHERE 1=1";
  const params: string[] = [];

  if (_req.query.tag) {
    sql += " AND tags LIKE ?";
    params.push(`%${String(_req.query.tag)}%`);
  }
  if (_req.query.brand) {
    sql += " AND brand_name LIKE ?";
    params.push(`%${String(_req.query.brand)}%`);
  }
  if (_req.query.campaign) {
    sql += " AND campaign_id = ?";
    params.push(String(_req.query.campaign));
  }
  if (_req.query.category) {
    sql += " AND category = ?";
    params.push(String(_req.query.category));
  }

  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// GET categories list
router.get("/categories", (_req, res) => {
  const rows = db.prepare(
    "SELECT DISTINCT category FROM research WHERE category != '' ORDER BY category"
  ).all() as { category: string }[];
  res.json(rows.map((r) => r.category));
});

// GET single
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM research WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(toCamel(row as Record<string, unknown>));
});

// GET linked prospects for a research entry
router.get("/:id/prospects", (req, res) => {
  const rows = db.prepare(`
    SELECT p.* FROM prospects p
    JOIN research_prospects rp ON rp.prospect_id = p.id
    WHERE rp.research_id = ?
    ORDER BY p.name
  `).all(Number(req.params.id));
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// POST create
router.post("/", (req, res) => {
  const b = toSnake(req.body);
  const result = db.prepare(
    `INSERT INTO research (title, source_url, tags, summary, content, brand_name, campaign_id, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.title ?? ""),
    String(b.source_url || ""),
    String(b.tags || ""),
    String(b.summary || ""),
    String(b.content || ""),
    String(b.brand_name || ""),
    b.campaign_id ? Number(b.campaign_id) : null,
    String(b.category || "general")
  );
  const created = db.prepare("SELECT * FROM research WHERE id = ?").get(result.lastInsertRowid);
  logActivity("create", "research", String(result.lastInsertRowid), `Research: ${b.title}`);
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
    if (key === "campaign_id") {
      values.push(val ? Number(val) : null);
    } else {
      values.push(val == null ? "" : String(val));
    }
  }
  fields.push("updated_at = datetime('now')");
  values.push(Number(req.params.id));

  db.prepare(`UPDATE research SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM research WHERE id = ?").get(Number(req.params.id));
  res.json(toCamel(updated as Record<string, unknown>));
});

// PUT link/unlink prospects
router.put("/:id/prospects", (req, res) => {
  const researchId = Number(req.params.id);
  const { prospectIds } = req.body as { prospectIds: number[] };

  // Clear existing links
  db.prepare("DELETE FROM research_prospects WHERE research_id = ?").run(researchId);

  // Insert new links
  const insert = db.prepare("INSERT INTO research_prospects (research_id, prospect_id) VALUES (?, ?)");
  for (const pid of prospectIds) {
    insert.run(researchId, pid);
  }

  res.json({ success: true, linked: prospectIds.length });
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM research WHERE id = ?").run(Number(req.params.id));
  res.json({ success: true });
});

export default router;
