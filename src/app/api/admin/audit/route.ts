import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** سجل التدقيق مع فلاتر (الإجراء / الكيان / بحث حر) */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? undefined;
  const entity = sp.get("entity") ?? undefined;
  const q = sp.get("q")?.trim() || undefined;
  const take = Math.min(Number(sp.get("take") ?? 100), 300);

  const where: Record<string, unknown> = {};
  if (action && action !== "all") where.action = action;
  if (entity && entity !== "all") where.entity = entity;
  if (q) where.OR = [{ details: { contains: q } }, { entity: { contains: q } }, { actor: { contains: q } }];

  const logs = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take });
  const actions = await db.auditLog.groupBy({ by: ["action"], _count: { _all: true } });
  const entities = await db.auditLog.groupBy({ by: ["entity"], _count: { _all: true } });
  return NextResponse.json({
    logs,
    facets: {
      actions: actions.map((a) => ({ value: a.action, count: a._count._all })),
      entities: entities.map((e) => ({ value: e.entity, count: e._count._all })),
    },
  });
}

/** تفريغ السجل بالكامل — يتطلب جلسة إدارية ويُسجَّل نفسه */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const count = await db.auditLog.deleteMany({});
  await createAudit("delete", "AuditLog", undefined, `تفريغ سجل التدقيق (${count.count} سجلًا)`, admin.username);
  return NextResponse.json({ ok: true, deleted: count.count });
}
