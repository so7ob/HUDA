import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * سير عمل النشر: مسودة → مراجعة → اعتماد → نشر → أرشفة
 * ملاحظة أمان: النص القرآني (QuranAyah) لا يُعدَّل من هنا إطلاقًا —
 * الاستيراد القرآني يتم عبر سكربت موثق منفصل مع تحقق من سلامة المصدر.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status: string };
  const valid = ["draft", "review", "approved", "published", "archived"];
  if (!valid.includes(status)) return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  const book = await db.book.update({ where: { id }, data: { status } });
  await createAudit("publish", "Book", id, `تغيير حالة «${book.title}» إلى: ${status}`);
  return NextResponse.json({ book });
}
