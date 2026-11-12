import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * استعادة نسخة احتياطية — تُستبدل بيانات الاستخدام الشخصية فقط.
 * النص القرآني والتفسير غير قابلين للاستبدال من هنا (حماية المحتوى المرجعي).
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const body = (await req.json()) as { data?: Record<string, unknown> };
  if (!body.data) return NextResponse.json({ error: "لا توجد بيانات" }, { status: 400 });
  const d = body.data as {
    favorites?: { kind: string; refKey: string; label: string; detail?: string }[];
    bookmarks?: { kind: string; refKey: string; label: string }[];
  };
  if (d.favorites) {
    await db.favorite.deleteMany();
    for (const f of d.favorites) {
      await db.favorite.upsert({
        where: { kind_refKey: { kind: f.kind, refKey: f.refKey } },
        update: {},
        create: f,
      });
    }
  }
  if (d.bookmarks) {
    await db.bookmark.deleteMany();
    for (const b of d.bookmarks) {
      await db.bookmark.upsert({
        where: { kind_refKey: { kind: b.kind, refKey: b.refKey } },
        update: {},
        create: b,
      });
    }
  }
  await createAudit("update", "Backup", undefined, `استعادة نسخة احتياطية (${d.favorites?.length ?? 0} مفضلة، ${d.bookmarks?.length ?? 0} علامة)`, admin.username);
  return NextResponse.json({ ok: true });
}
