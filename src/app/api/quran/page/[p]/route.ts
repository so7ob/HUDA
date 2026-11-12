import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ p: string }> }) {
  const { p } = await ctx.params;
  const page = parseInt(p, 10);
  if (!Number.isInteger(page) || page < 1 || page > 604) {
    return NextResponse.json({ error: "رقم صفحة غير صالح (1-604)" }, { status: 400 });
  }
  const ayahs = await db.quranAyah.findMany({
    where: { page },
    orderBy: { id: "asc" },
  });
  const tafsir = await db.tafsirAyah.findMany({
    where: { tafsirKey: "muyassar", ayahId: { in: ayahs.map((a) => a.id) } },
  });
  const tMap = new Map(tafsir.map((t) => [t.ayahId, t.text]));
  const surahNums = [...new Set(ayahs.map((a) => a.surah))];
  const surahs = await db.quranSurah.findMany({ where: { number: { in: surahNums } } });
  return NextResponse.json({
    page,
    ayahs: ayahs.map((a) => ({ ...a, tafsir: tMap.get(a.id) })),
    surahs,
  });
}
