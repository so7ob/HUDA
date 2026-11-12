import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** حزم المحتوى — حالة التنزيل المحلي والتحديثات */
export async function GET() {
  const packages = await db.contentPackage.findMany({ orderBy: { kind: "asc" } });
  return NextResponse.json({ packages });
}

/** تحديث حزمة — محاكاة إعادة التحقق من السلامة (بيئة الويب: البيانات محلية دائمًا) */
export async function POST(req: NextRequest) {
  const { key } = (await req.json()) as { key: string };
  if (!key) return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  await db.contentPackage.update({
    where: { key },
    data: { status: "installed", installedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
