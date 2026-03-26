import { Router } from "express";
import { db } from "../db.js";
import { toCamelArray } from "../lib/case-convert.js";

const router = Router();

// GET /api/dashboard/kpis
router.get("/kpis", (_req, res) => {
  const prospects = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pendiente,
      SUM(CASE WHEN status = 'aceptada' THEN 1 ELSE 0 END) as aceptada,
      SUM(CASE WHEN status = 'dm_sent' THEN 1 ELSE 0 END) as dm_sent,
      SUM(CASE WHEN status = 'rechazada' THEN 1 ELSE 0 END) as rechazada
    FROM prospects
  `).get() as Record<string, number>;

  const content = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM content_status
  `).get() as Record<string, number>;

  const research = db.prepare("SELECT COUNT(*) as total FROM research").get() as { total: number };
  const campaigns = db.prepare("SELECT COUNT(*) as total FROM campaigns WHERE status = 'active'").get() as { total: number };

  res.json({
    prospects: {
      total: prospects.total ?? 0,
      pendiente: prospects.pendiente ?? 0,
      aceptada: prospects.aceptada ?? 0,
      dmSent: prospects.dm_sent ?? 0,
      rechazada: prospects.rechazada ?? 0,
    },
    content: {
      published: content.published ?? 0,
      approved: content.approved ?? 0,
      draft: content.draft ?? 0,
      failed: content.failed ?? 0,
    },
    research: { total: research.total },
    campaigns: { total: campaigns.total },
  });
});

// GET /api/dashboard/activity?limit=20
router.get("/activity", (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const rows = db.prepare(
    "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?"
  ).all(limit);
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

// GET /api/dashboard/pending-actions
router.get("/pending-actions", (_req, res) => {
  const actions: { type: string; count: number; description: string; navigateTo: string }[] = [];

  // Prospects accepted without follow-up
  const noFollowup = db.prepare(`
    SELECT COUNT(*) as n FROM prospects
    WHERE status = 'aceptada' AND (last_followup_at IS NULL OR last_followup_at = '')
  `).get() as { n: number };
  if (noFollowup.n > 0) {
    actions.push({
      type: "prospect_followup",
      count: noFollowup.n,
      description: `${noFollowup.n} prospecto${noFollowup.n > 1 ? "s" : ""} aceptado${noFollowup.n > 1 ? "s" : ""} sin follow-up`,
      navigateTo: "prospects",
    });
  }

  // Approved content not published
  const approvedNotPublished = db.prepare(`
    SELECT COUNT(*) as n FROM content_status WHERE status = 'approved'
  `).get() as { n: number };
  if (approvedNotPublished.n > 0) {
    actions.push({
      type: "content_publish",
      count: approvedNotPublished.n,
      description: `${approvedNotPublished.n} post${approvedNotPublished.n > 1 ? "s" : ""} aprobado${approvedNotPublished.n > 1 ? "s" : ""} listo${approvedNotPublished.n > 1 ? "s" : ""} para publicar`,
      navigateTo: "content",
    });
  }

  // Failed publications
  const failed = db.prepare(`
    SELECT COUNT(*) as n FROM content_status WHERE status = 'failed'
  `).get() as { n: number };
  if (failed.n > 0) {
    actions.push({
      type: "content_failed",
      count: failed.n,
      description: `${failed.n} publicacion${failed.n > 1 ? "es" : ""} fallida${failed.n > 1 ? "s" : ""}`,
      navigateTo: "content",
    });
  }

  res.json(actions);
});

export default router;
