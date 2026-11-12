import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const topics = await db.quranTopic.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    include: { ayahs: { orderBy: { id: "asc" } } },
  });
  // أرفق نص أول 3 آيات لكل موضوع للعرض السريع
  const ayahRefs = topics.flatMap((t) => t.ayahs.map((a) => `${a.surah}:${a.ayah}`));
  const ayahs = await db.quranAyah.findMany({
    where: { surah: { in: ayahRefs.map((r) => parseInt(r.split(":")[0])) } },
  });
  const key = (s: number, a: number) => `${s}:${a}`;
  const amap = new Map(ayahs.map((x) => [key(x.surah, x.numberInSurah), x.text]));
  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      description: t.description,
      ayahCount: t.ayahs.length,
      ayahs: t.ayahs.map((a) => ({
        surah: a.surah,
        ayah: a.ayah,
        note: a.note,
        text: amap.get(key(a.surah, a.ayah)),
      })),
    })),
  });
}
