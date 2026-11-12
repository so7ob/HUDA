import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeArabic, parseQuery } from "@/lib/arabic";

export const dynamic = "force-dynamic";

/**
 * البحث الشامل — يعمل محليًا على المحتوى المخزَّن:
 * الآيات (بالنص العثماني) + أسماء السور + التفسير + الكتب والفصول + المواضيع
 * التطبيع يُطبَّق على المطابقة فقط، والنصوص الأصلية تُعاد كما هي.
 */
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const arNum = (n: number | string) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const tokens = parseQuery(q);
  if (tokens.normalized.length < 2 && !/^\d+$/.test(tokens.raw)) {
    return NextResponse.json({ results: [], query: q });
  }

  const results: {
    kind: "ayah" | "tafsir" | "book" | "chapter" | "surah" | "topic";
    title: string;
    snippet: string;
    surah?: number;
    ayahInSurah?: number;
    bookId?: string;
    ref: string;
  }[] = [];

  // بحث رقمي: الانتقال المباشر إلى سورة
  if (/^\d{1,3}$/.test(tokens.raw)) {
    const n = parseInt(tokens.raw, 10);
    if (n >= 1 && n <= 114) {
      const s = await db.quranSurah.findUnique({ where: { number: n } });
      if (s) {
        results.push({ kind: "surah", title: `سورة ${s.name}`, snippet: `${s.revelationType} — ${arNum(s.ayahCount)} آية — تبدأ في الصفحة ${arNum(s.startPage)}`, surah: s.number, ref: `surah:${s.number}` });
      }
    }
  }

  const qNorm = tokens.normalized;

  // 1) أسماء السور (مع الأسماء والألقاب المستوردة من قاعدة بيانات «هدى»)
  const surahs = await db.quranSurah.findMany();
  for (const s of surahs) {
    const hay = `${s.name} ${s.nameFull} ${s.aliases ?? ""}`;
    if (normalizeArabic(hay).includes(qNorm)) {
      const matchedAlias =
        !normalizeArabic(s.name).includes(qNorm) && !normalizeArabic(s.nameFull).includes(qNorm)
          ? (s.aliases ?? "")
              .split("،")
              .map((a) => a.trim())
              .find((a) => normalizeArabic(a).includes(qNorm))
          : undefined;
      results.push({
        kind: "surah",
        title: `سورة ${s.name}`,
        snippet: matchedAlias
          ? `${matchedAlias} — ${s.revelationType} — ${arNum(s.ayahCount)} آية`
          : `${s.revelationType} — ${arNum(s.ayahCount)} آية`,
        surah: s.number,
        ref: `surah:${s.number}`,
      });
    }
  }

  // 2) الآيات (فهرس مُطبَّع يُبنى عند البحث — 6236 آية سريعة)
  const ayahs = await db.quranAyah.findMany({ select: { id: true, surah: true, numberInSurah: true, text: true } });
  const surahMap = new Map(surahs.map((s) => [s.number, s.name]));
  let ayahHits = 0;
  for (const a of ayahs) {
    if (ayahHits >= 60) break;
    const norm = normalizeArabic(a.text);
    if (norm.includes(qNorm)) {
      results.push({
        kind: "ayah",
        title: `سورة ${surahMap.get(a.surah)} — آية ${arNum(a.numberInSurah)}`,
        snippet: a.text,
        surah: a.surah,
        ayahInSurah: a.numberInSurah,
        ref: `ayah:${a.id}`,
      });
      ayahHits++;
    }
  }

  // 3) التفسير
  if (ayahHits < 60) {
    const tafsirRows = await db.tafsirAyah.findMany({
      where: { tafsirKey: "muyassar" },
      select: { ayahId: true, text: true },
    });
    const idToRef = new Map(ayahs.map((a) => [a.id, a]));
    let tHits = 0;
    for (const t of tafsirRows) {
      if (tHits >= 25) break;
      if (normalizeArabic(t.text).includes(qNorm)) {
        const a = idToRef.get(t.ayahId);
        if (a) {
          results.push({
            kind: "tafsir",
            title: `تفسير آية ${arNum(a.numberInSurah)} — سورة ${surahMap.get(a.surah)}`,
            snippet: t.text.slice(0, 220),
            surah: a.surah,
            ayahInSurah: a.numberInSurah,
            ref: `tafsir:${a.surah}:${a.numberInSurah}`,
          });
          tHits++;
        }
      }
    }
  }

  // 4) الكتب والفصول
  const books = await db.book.findMany({ where: { status: "published" } });
  for (const b of books) {
    if (results.filter((r) => r.kind === "book").length >= 15) break;
    if (normalizeArabic(`${b.title} ${b.author ?? ""} ${b.description ?? ""}`).includes(qNorm)) {
      results.push({
        kind: "book",
        title: b.title,
        snippet: b.description ?? "",
        bookId: b.id,
        ref: `book:${b.id}`,
      });
    }
  }
  const chapters = await db.chapter.findMany({
    where: { status: "published" },
    include: { book: { select: { id: true, title: true, status: true } } },
  });
  for (const c of chapters) {
    if (results.filter((r) => r.kind === "chapter").length >= 15) break;
    if (c.book.status !== "published") continue;
    if (normalizeArabic(`${c.title} ${c.content}`).includes(qNorm)) {
      results.push({
        kind: "chapter",
        title: c.title,
        snippet: c.content.replace(/\*\*/g, "").slice(0, 200),
        bookId: c.book.id,
        ref: `chapter:${c.id}`,
      });
    }
  }

  // 5) المواضيع
  const topics = await db.quranTopic.findMany({ where: { isPublished: true } });
  for (const t of topics) {
    if (normalizeArabic(`${t.title} ${t.description ?? ""}`).includes(qNorm)) {
      results.push({ kind: "topic", title: `الموضوع: ${t.title}`, snippet: t.description ?? "", ref: `topic:${t.id}` });
    }
  }

  return NextResponse.json({ results: results.slice(0, 80), query: q });
}
