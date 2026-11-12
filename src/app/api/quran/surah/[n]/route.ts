import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ n: string }> }) {
  const { n } = await ctx.params;
  const surahNumber = parseInt(n, 10);
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return NextResponse.json({ error: "رقم سورة غير صالح" }, { status: 400 });
  }
  const surah = await db.quranSurah.findUnique({ where: { number: surahNumber } });
  if (!surah) return NextResponse.json({ error: "السورة غير موجودة" }, { status: 404 });
  const ayahs = await db.quranAyah.findMany({
    where: { surah: surahNumber },
    orderBy: { numberInSurah: "asc" },
  });
  const tafsir = await db.tafsirAyah.findMany({
    where: { tafsirKey: "muyassar", ayahId: { in: ayahs.map((a) => a.id) } },
  });
  const tMap = new Map(tafsir.map((t) => [t.ayahId, t.text]));
  return NextResponse.json({
    surah,
    ayahs: ayahs.map((a) => ({ ...a, tafsir: tMap.get(a.id) })),
  });
}
