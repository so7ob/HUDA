import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * بيانات رسم المصحف المدني لصفحة (1..604) — محرك الخطوط المرخصة QCF
 * المصدر: قاعدة بيانات «هدى» (so7ob/HUDA) المستوردة إلى QuranGlyph
 * يُرجع خانات العرض لكل صفحة: سطور رموز، صناديق السور، سطور البسملة.
 * النص الرسومي لا يُعدَّل إطلاقًا — يُعرض كما استُورد من المصدر المعتمد.
 *
 * ⚠️ ملاحظة ترقيم: قاعدة «هدى» تعدّ البسملة آيةً مستقلة (ayah_number=0) لكل
 * سورة عدا الفاتحة والتوبة، فإجمالي صفوفها 6348 بدل 6236، وأرقام ayah_id
 * فيها منزاحة عن الترقيم العالمي القياسي بمقدار عدد البسملات السابقة
 * (مثال: البقرة 2 = هدى 10 بينما القياسي 9). لذلك يُطبّع aid هنا إلى
 * الرقم العالمي القياسي (المعتمد للصوت والتظليل والمفضلة والتفسير) عبر
 * الربط مع QuranAyah على (السورة، رقم الآية) — دون تعديل بيانات المصدر.
 */

interface GlyphItem {
  c: string; // المحرف الرسومي (نقطة يونيكود داخل خط الصفحة)
  t: number; // 1=كلمة 2=نهاية آية 3=علامة وقف 4=حزب 5=سجدة
  ay: number; // رقم الآية في السورة
  s: number; // رقم السورة
  aid: number; // الرقم العالمي للآية
}

interface Slot {
  kind: "text" | "header" | "bismillah";
  line?: number;
  items?: GlyphItem[];
  surah?: number;
  surahName?: string;
  withBismillahInline?: boolean; // البسملة بنفس سطر الصندوق (حين لا تتسع سطور الصفحة)
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ p: string }> }) {
  const { p } = await ctx.params;
  const page = parseInt(p, 10);
  if (!Number.isInteger(page) || page < 1 || page > 604) {
    return NextResponse.json({ error: "رقم صفحة غير صالح (1-604)" }, { status: 400 });
  }

  const glyphs = await db.quranGlyph.findMany({
    where: { pageId: page },
    orderBy: { id: "asc" },
  });

  if (!glyphs.length) {
    return NextResponse.json({ page, slots: [], surahs: [], juz: 0, hizbQuarter: 0 });
  }

  /* تطبيع الترقيم: تحويل ayah_id بنظام «هدى» إلى الرقم العالمي القياسي
     المعتمد في QuranAyah وملفات الصوت (cdn.islamic.network) عبر الربط
     على (رقم السورة، رقم الآية في السورة). */
  const surahNumsForMap = [...new Set(glyphs.map((g) => g.surahId))];
  const ayahRows = await db.quranAyah.findMany({
    where: { surah: { in: surahNumsForMap } },
    select: { id: true, surah: true, numberInSurah: true },
  });
  const stdAyahId = new Map<string, number>(
    ayahRows.map((a) => [`${a.surah}:${a.numberInSurah}`, a.id])
  );

  // تجميع الرموز في سطور
  const lineMap = new Map<number, GlyphItem[]>();
  for (const g of glyphs) {
    const arr = lineMap.get(g.lineNumber) ?? [];
    arr.push({
      c: String.fromCodePoint(g.code),
      t: g.glyphTypeId,
      ay: g.ayahNumber,
      s: g.surahId,
      aid: stdAyahId.get(`${g.surahId}:${g.ayahNumber}`) ?? g.ayahId,
    });
    lineMap.set(g.lineNumber, arr);
  }

  const firstAyahOnPage = await db.quranAyah.findFirst({
    where: { page },
    orderBy: { id: "asc" },
    select: { juz: true, hizbQuarter: true },
  });

  const surahs = await db.quranSurah.findMany({
    where: { number: { in: surahNumsForMap } },
    select: { number: true, name: true, nameFull: true, ayahCount: true, revelationType: true },
  });
  const surahMap = new Map(surahs.map((s) => [s.number, s]));

  // ترتيب السطور الحاوية رموزًا
  const glyphLines = [...lineMap.keys()].sort((a, b) => a - b);

  // خانات العرض: سطور رموز + صناديق السور + سطور البسملة
  const slots: Slot[] = [];
  let prevLine = 0;

  for (const line of glyphLines) {
    const items = lineMap.get(line) ?? [];
    const lineSurah = items[0]?.s ?? 0;

    // هل تبدأ سورة جديدة قبل هذا السطر؟
    const isNewSurahAtTop = prevLine === 0 && line > 1;
    const prevSurah = prevLine > 0 ? lineMap.get(prevLine)?.[0]?.s : 0;
    const isTransition = prevLine > 0 && prevSurah !== lineSurah;
    const startsSurah =
      (isNewSurahAtTop || isTransition) &&
      // أول آية من السورة الجديدة في هذا السطر هي آيتها الأولى (بداية فعلية)
      items.some((x) => x.s === lineSurah && x.ay === 1);

    if (startsSurah) {
      const meta = surahMap.get(lineSurah);
      const withBismillah = lineSurah !== 1 && lineSurah !== 9;
      const needSlots = withBismillah ? 2 : 1;
      // موضع الصندوق: قبل سطر الرموز مباشرة (يغطي الفجوة المتاحة)
      const headerAt = Math.max(prevLine + 1, line - needSlots);
      const bismillahAt = withBismillah ? headerAt + 1 : 0;

      // خانات فارغة قبل الصندوق (احتياط)
      for (let l = prevLine + 1; l < headerAt; l++) slots.push({ kind: "text", line: l, items: [] });

      slots.push({
        kind: "header",
        surah: lineSurah,
        surahName: meta?.name ?? "",
        withBismillahInline: withBismillah && bismillahAt >= line,
      });
      if (withBismillah && bismillahAt < line) slots.push({ kind: "bismillah", surah: lineSurah });
      prevLine = headerAt + (withBismillah ? 1 : 0);
    } else {
      // سطور فارغة بين السطور (احتياط)
      for (let l = prevLine + 1; l < line; l++) slots.push({ kind: "text", line: l, items: [] });
    }

    slots.push({ kind: "text", line, items });
    prevLine = line;
  }

  return NextResponse.json({
    page,
    juz: firstAyahOnPage?.juz ?? 1,
    hizbQuarter: firstAyahOnPage?.hizbQuarter ?? 1,
    slots,
    surahs,
  });
}
