import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** فهرس الجزء: السور الواردة فيه مع نطاق صفحاتها داخل الجزء */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ n: string }> }) {
  const { n } = await ctx.params;
  const juz = parseInt(n, 10);
  if (!Number.isInteger(juz) || juz < 1 || juz > 30) {
    return NextResponse.json({ error: "رقم جزء غير صالح" }, { status: 400 });
  }
  const ayahs = await db.quranAyah.findMany({ where: { juz }, orderBy: { id: "asc" } });
  if (!ayahs.length) return NextResponse.json({ error: "الجزء غير موجود" }, { status: 404 });
  const surahNums = [...new Set(ayahs.map((a) => a.surah))];
  const surahs = await db.quranSurah.findMany({ where: { number: { in: surahNums } }, orderBy: { number: "asc" } });
  const pagesBySurah = new Map<number, { min: number; max: number }>();
  for (const a of ayahs) {
    const cur = pagesBySurah.get(a.surah);
    if (!cur) pagesBySurah.set(a.surah, { min: a.page, max: a.page });
    else {
      cur.min = Math.min(cur.min, a.page);
      cur.max = Math.max(cur.max, a.page);
    }
  }
  return NextResponse.json({
    juz,
    ayahFrom: ayahs[0],
    surahs: surahs.map((s) => ({
      ...s,
      pageFrom: pagesBySurah.get(s.number)?.min ?? s.startPage,
      pageTo: pagesBySurah.get(s.number)?.max ?? s.startPage,
    })),
  });
}
