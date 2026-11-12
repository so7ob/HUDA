/** سجل التدقيق الإداري */
import { db } from "@/lib/db";

export async function createAudit(
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  actor?: string
) {
  try {
    await db.auditLog.create({ data: { action, entity, entityId, details, actor: actor ?? "admin" } });
  } catch (e) {
    console.error("audit failed", e);
  }
}
