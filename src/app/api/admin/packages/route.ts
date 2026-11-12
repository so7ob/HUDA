import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** إدارة حزم المحتوى من اللوحة — جميع الحزم مع تفاصيلها */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const packages = await db.contentPackage.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] });
  return NextResponse.json({ packages });
}

/**
 * إجراء على حزمة: تحديث (إعادة تثبيت/رفع إصدار) أو تثبيت حزمة متاحة.
 * بيئة الويب الحالية: المحتوى محلي مضمّن — الإجراء يجدد طابع التثبيت ويرفع الإصدار.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { key, bumpVersion } = (await req.json()) as { key?: string; bumpVersion?: boolean };
  if (!key) return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });

  const pkg = await db.contentPackage.findUnique({ where: { key } });
  if (!pkg) return NextResponse.json({ error: "حزمة غير موجودة" }, { status: 404 });

  const updated = await db.contentPackage.update({
    where: { key },
    data: {
      status: "installed",
      installedAt: new Date(),
      version: bumpVersion ? pkg.version + 1 : pkg.version,
    },
  });
  await createAudit(
    "update",
    "ContentPackage",
    pkg.id,
    `${bumpVersion ? "رفع إصدار" : "تحديث"} حزمة: ${pkg.name} → v${updated.version}`,
    admin.username
  );
  return NextResponse.json({ ok: true, package: updated });
}
