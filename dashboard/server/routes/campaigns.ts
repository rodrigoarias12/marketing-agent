import { Router } from "express";
import { db } from "../db.js";
import { toCamel, toCamelArray, toSnake } from "../lib/case-convert.js";
import type { SQLInputValue } from "node:sqlite";

const router = Router();

// GET all campaigns with prospect counts
router.get("/", (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM prospects WHERE campaign_id = c.id) as prospect_count,
      (SELECT COUNT(*) FROM prospects WHERE campaign_id = c.id AND status = 'pendiente') as pendiente_count,
      (SELECT COUNT(*) FROM prospects WHERE campaign_id = c.id AND status = 'aceptada') as aceptada_count,
      (SELECT COUNT(*) FROM prospects WHERE campaign_id = c.id AND status = 'dm_sent') as dm_sent_count
    FROM campaigns c ORDER BY c.created_at DESC
  `).all();
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// GET single
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(toCamel(row as Record<string, unknown>));
});

// POST create
router.post("/", (req, res) => {
  const b = toSnake(req.body);
  const result = db.prepare(
    `INSERT INTO campaigns (name, vertical, description) VALUES (?, ?, ?)`
  ).run(String(b.name ?? ""), String(b.vertical || ""), String(b.description || ""));
  const created = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(result.lastInsertRowid);
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
    values.push(val == null ? "" : String(val));
  }
  fields.push("updated_at = datetime('now')");
  values.push(Number(req.params.id));
  db.prepare(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(Number(req.params.id));
  res.json(toCamel(updated as Record<string, unknown>));
});

// DELETE
router.delete("/:id", (req, res) => {
  db.exec(`UPDATE prospects SET campaign_id = NULL WHERE campaign_id = ${Number(req.params.id)}`);
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(Number(req.params.id));
  res.json({ success: true });
});

export default router;
