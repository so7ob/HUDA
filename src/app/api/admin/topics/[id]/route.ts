import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** تفاصيل موضوع للإدارة — الآيات مع معرفاتها ونصوصها لإدارة القائمة */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const topic = await db.quranTopic.findUnique({
    where: { id },
    include: { ayahs: { orderBy: [{ surah: "asc" }, { ayah: "asc" }] } },
  });
  if (!topic) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const surahNums = [...new Set(topic.ayahs.map((a) => a.surah))];
  const ayahRows = surahNums.length
    ? await db.quranAyah.findMany({
        where: { surah: { in: surahNums } },
        select: { surah: true, numberInSurah: true, text: true },
      })
    : [];
  const textMap = new Map(ayahRows.map((a) => [`${a.surah}:${a.numberInSurah}`, a.text]));

  return NextResponse.json({
    topic: {
      id: topic.id,
      key: topic.key,
      title: topic.title,
      description: topic.description,
      isPublished: topic.isPublished,
      ayahCount: topic.ayahCount,
      ayahs: topic.ayahs.map((a) => ({
        id: a.id,
        surah: a.surah,
        ayah: a.ayah,
        note: a.note,
        text: textMap.get(`${a.surah}:${a.ayah}`) ?? "",
      })),
    },
  });
}

/** تعديل المواضيع — إضافة/حذف آيات موضوع مراجَعة */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    title?: string;
    description?: string;
    isPublished?: boolean;
    addAyahs?: { surah: number; ayah: number; note?: string }[];
    removeAyahIds?: string[];
  };
  const data: Record<string, unknown> = {};
  if (body.title) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.isPublished !== undefined) data.isPublished = body.isPublished;
  await db.quranTopic.update({ where: { id }, data });

  if (body.removeAyahIds?.length) {
    await db.topicAyah.deleteMany({ where: { id: { in: body.removeAyahIds }, topicId: id } });
  }
  if (body.addAyahs?.length) {
    for (const a of body.addAyahs) {
      const exists = await db.quranAyah.findFirst({ where: { surah: a.surah, numberInSurah: a.ayah } });
      if (!exists) continue; // رفض الآيات غير الصحيحة — لا إضافة لمصادر غير موثقة
      await db.topicAyah.upsert({
        where: { topicId_surah_ayah: { topicId: id, surah: a.surah, ayah: a.ayah } },
        update: { note: a.note ?? null },
        create: { topicId: id, surah: a.surah, ayah: a.ayah, note: a.note ?? null },
      });
    }
  }
  const topic = await db.quranTopic.update({
    where: { id },
    data: { ayahCount: (await db.topicAyah.count({ where: { topicId: id } })) },
  });
  await createAudit("update", "QuranTopic", id, `تعديل موضوع: ${topic.title}`, admin.username);
  return NextResponse.json({ topic });
}
