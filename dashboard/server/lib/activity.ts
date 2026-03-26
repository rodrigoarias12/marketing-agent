import { db } from "../db.js";

export function logActivity(
  type: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  db.prepare(
    `INSERT INTO activity_log (type, entity_type, entity_id, description, metadata)
     VALUES (?, ?, ?, ?, ?)`
  ).run(type, entityType, entityId, description, JSON.stringify(metadata ?? {}));
}
