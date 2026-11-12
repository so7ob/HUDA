import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const topic = await db.quranTopic.findUnique({
    where: { id },
    include: { ayahs: { orderBy: { id: "asc" } } },
  });
  if (!topic) return NextResponse.json({ error: "الموضوع غير موجود" }, { status: 404 });
  const ayahs = await db.quranAyah.findMany({
    where: { surah: { in: [...new Set(topic.ayahs.map((a) => a.surah))] } },
  });
  const key = (s: number, a: number) => `${s}:${a}`;
  const amap = new Map(ayahs.map((x) => [key(x.surah, x.numberInSurah), x.text]));
  return NextResponse.json({
    topic: {
      id: topic.id,
      key: topic.key,
      title: topic.title,
      description: topic.description,
      ayahCount: topic.ayahs.length,
      ayahs: topic.ayahs.map((a) => ({
        surah: a.surah,
        ayah: a.ayah,
        note: a.note,
        text: amap.get(key(a.surah, a.ayah)),
      })),
    },
  });
}
