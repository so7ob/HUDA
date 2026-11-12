import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * حذف سجلات التنزيل:
 * - DELETE /api/downloads/delete?id={id}  → حذف فردي
 * - DELETE /api/downloads/delete?all=1    → حذف الكل
 * (ملفات الـ Blob المحلية تُحذف في العميل عبر مخزن IndexedDB)
 */
export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get("all") === "1") {
    const res = await db.downloadedRecitation.deleteMany({});
    return NextResponse.json({ ok: true, deleted: res.count });
  }
  const id = sp.get("id");
  if (!id) return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  await db.downloadedRecitation.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
