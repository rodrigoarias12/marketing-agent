import { Router } from "express";
import type { SQLInputValue } from "node:sqlite";
import { db } from "../db.js";
import { toCamel, toCamelArray, toSnake } from "../lib/case-convert.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

// GET all prospects with optional filters
router.get("/", (_req, res) => {
  let sql = "SELECT * FROM prospects WHERE 1=1";
  const params: string[] = [];

  if (_req.query.status) {
    sql += " AND status = ?";
    params.push(String(_req.query.status));
  }
  if (_req.query.region) {
    sql += " AND region = ?";
    params.push(String(_req.query.region));
  }
  if (_req.query.campaign) {
    sql += " AND campaign_id = ?";
    params.push(String(_req.query.campaign));
  }

  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// GET pipeline view: prospects grouped by status
router.get("/pipeline", (_req, res) => {
  let where = "WHERE 1=1";
  const params: string[] = [];

  if (_req.query.campaign) {
    where += " AND campaign_id = ?";
    params.push(String(_req.query.campaign));
  }
  if (_req.query.region) {
    where += " AND region = ?";
    params.push(String(_req.query.region));
  }

  const rows = db.prepare(`SELECT * FROM prospects ${where} ORDER BY updated_at DESC`).all(...params);
  const all = toCamelArray(rows as Record<string, unknown>[]);

  const pipeline: Record<string, unknown[]> = {
    pendiente: [],
    aceptada: [],
    dm_sent: [],
    rechazada: [],
  };

  for (const p of all) {
    const status = (p as { status: string }).status;
    if (pipeline[status]) pipeline[status].push(p);
  }

  res.json(pipeline);
});

// GET single
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM prospects WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(toCamel(row as Record<string, unknown>));
});

// GET linked research for a prospect
router.get("/:id/research", (req, res) => {
  const rows = db.prepare(`
    SELECT r.* FROM research r
    JOIN research_prospects rp ON rp.research_id = r.id
    WHERE rp.prospect_id = ?
    ORDER BY r.created_at DESC
  `).all(Number(req.params.id));
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// POST create
router.post("/", (req, res) => {
  const b = toSnake(req.body);
  const result = db.prepare(
    `INSERT INTO prospects (name, company, role, location, linkedin_url, degree, status, message_sent, notes, region, campaign_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.name ?? ""), String(b.company ?? ""), String(b.role || ""), String(b.location || ""),
    String(b.linkedin_url || ""), String(b.degree || ""), String(b.status || "pendiente"),
    String(b.message_sent || ""), String(b.notes || ""), String(b.region || ""),
    b.campaign_id ? Number(b.campaign_id) : null
  );
  const created = db.prepare("SELECT * FROM prospects WHERE id = ?").get(result.lastInsertRowid);
  logActivity("create", "prospect", String(result.lastInsertRowid), `Nuevo prospecto: ${b.name} (${b.company})`);
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

  db.prepare(`UPDATE prospects SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM prospects WHERE id = ?").get(Number(req.params.id));
  const statusChanged = b.status ? ` → ${b.status}` : "";
  logActivity("update", "prospect", req.params.id, `Prospecto actualizado${statusChanged}`, b);
  res.json(toCamel(updated as Record<string, unknown>));
});

// PUT followup: increment count + save message + update timestamp
router.put("/:id/followup", (req, res) => {
  const id = Number(req.params.id);
  const { messageSent } = req.body;

  db.prepare(`
    UPDATE prospects SET
      followup_count = followup_count + 1,
      last_followup_at = datetime('now'),
      message_sent = ?,
      status = 'dm_sent',
      updated_at = datetime('now')
    WHERE id = ?
  `).run(String(messageSent || ""), id);

  const updated = db.prepare("SELECT * FROM prospects WHERE id = ?").get(id);
  logActivity("followup", "prospect", String(id), `Follow-up enviado a prospecto #${id}`);
  res.json(toCamel(updated as Record<string, unknown>));
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM prospects WHERE id = ?").run(Number(req.params.id));
  res.json({ success: true });
});

export default router;
