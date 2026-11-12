import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** صفحات القرآن — فهرس 604 صفحات مع السورة والجزء لكل صفحة */
export async function GET() {
  const rows = await db.quranAyah.groupBy({
    by: ["page", "surah"],
    _min: { id: true },
    orderBy: { page: "asc" },
  });
  const surahs = await db.quranSurah.findMany();
  const sMap = new Map(surahs.map((s) => [s.number, s]));
  const ayahs = await db.quranAyah.findMany({
    where: { page: { in: rows.map((r) => r.page) } },
    select: { page: true, juz: true },
  });
  const juzMap = new Map<number, number>();
  for (const a of ayahs) if (!juzMap.has(a.page)) juzMap.set(a.page, a.juz);
  const pages = rows.map((r) => ({
    page: r.page,
    surah: r.surah,
    surahName: sMap.get(r.surah)?.name ?? "",
    juz: juzMap.get(r.page) ?? 1,
  }));
  return NextResponse.json({ pages });
}
