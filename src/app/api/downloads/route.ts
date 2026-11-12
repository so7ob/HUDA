import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const downloads = await db.downloadedRecitation.findMany({ orderBy: { createdAt: "desc" } });
  const reciters = await db.reciter.findMany();
  const rMap = new Map(reciters.map((r) => [r.id, r.name]));
  const surahs = await db.quranSurah.findMany();
  const sMap = new Map(surahs.map((s) => [s.number, s.name]));
  return NextResponse.json({
    downloads: downloads.map((d) => ({
      ...d,
      reciterName: rMap.get(d.reciterId) ?? d.reciterId,
      surahName: sMap.get(d.surah) ?? `سورة ${d.surah}`,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { reciterId, reciterName, surah, surahName, ayahCount, sizeBytes } = (await req.json()) as Record<string, string | number>;
  if (!reciterId || !surah) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  await db.downloadedRecitation.upsert({
    where: { reciterId_surah: { reciterId: String(reciterId), surah: Number(surah) } },
    update: { status: "downloaded", sizeBytes: Number(sizeBytes) || 0, ayahCount: Number(ayahCount) || 0 },
    create: {
      reciterId: String(reciterId),
      surah: Number(surah),
      ayahCount: Number(ayahCount) || 0,
      sizeBytes: Number(sizeBytes) || 0,
      status: "downloaded",
    },
  });
  void reciterName;
  void surahName;
  return NextResponse.json({ ok: true });
}
