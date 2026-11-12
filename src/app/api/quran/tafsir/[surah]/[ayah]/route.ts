import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ surah: string; ayah: string }> }) {
  const { surah, ayah } = await ctx.params;
  const s = parseInt(surah, 10);
  const a = parseInt(ayah, 10);
  if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1) {
    return NextResponse.json({ error: "إحالة غير صالحة" }, { status: 400 });
  }
  const globalAyah = await db.quranAyah.findFirst({ where: { surah: s, numberInSurah: a } });
  if (!globalAyah) return NextResponse.json({ error: "الآية غير موجودة" }, { status: 404 });
  const source = await db.tafsirSource.findFirst({ where: { isActive: true, isDefault: true } });
  if (!source) return NextResponse.json({ error: "لا يوجد تفسير مفعّل" }, { status: 404 });
  const t = await db.tafsirAyah.findUnique({
    where: { tafsirKey_ayahId: { tafsirKey: source.key, ayahId: globalAyah.id } },
  });
  return NextResponse.json({
    text: t?.text ?? "",
    source: { key: source.key, name: source.name, author: source.author, source: source.source },
  });
}
