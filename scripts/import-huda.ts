/**
 * استيراد بيانات رسم المصحف المدني (QCF) من قاعدة بيانات «هدى»
 * المصدر: db/sources/main_db.sqlite (so7ob/HUDA)
 * يستورد:
 *   1) quran_glyph → QuranGlyph (رموز الكلمات والعلامات لكل صفحة 1..604)
 *   2) quran_surah.names → QuranSurah.aliases (أسماء السور للبحث)
 * البيانات مرجعية معتمدة — لا تُعدَّل بعد الاستيراد.
 */
import { Database as BunDatabase } from "bun:sqlite";
import { PrismaClient } from "@prisma/client";

const SRC = new BunDatabase("db/sources/main_db.sqlite", { readonly: true });
const prisma = new PrismaClient();

async function main() {
  /* ---------- 1) الرموز (QCF glyphs) ---------- */
  const existingGlyphs = await prisma.quranGlyph.count();
  if (existingGlyphs > 0) {
    console.log(`⏭ QuranGlyph already imported (${existingGlyphs} rows) — skipping`);
  } else {
    console.time("read glyphs");
    const rows = SRC.prepare(
      "SELECT id, code, ayah_id, ayah_number, surah_id, page_id, line_number, glyph_type_id FROM quran_glyph ORDER BY id"
    ).all() as {
      id: number; code: number; ayah_id: number; ayah_number: number;
      surah_id: number; page_id: number; line_number: number; glyph_type_id: number;
    }[];
    console.timeEnd("read glyphs");
    console.log(`glyph rows: ${rows.length}`);

    console.time("import glyphs");
    const BATCH = 4000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH).map((r) => ({
        id: r.id,
        code: r.code,
        ayahId: r.ayah_id,
        ayahNumber: r.ayah_number,
        surahId: r.surah_id,
        pageId: r.page_id,
        lineNumber: r.line_number,
        glyphTypeId: r.glyph_type_id,
      }));
      await prisma.quranGlyph.createMany({ data: chunk });
      if ((i / BATCH) % 5 === 0) process.stdout.write(`  …${i + chunk.length}/${rows.length}\n`);
    }
    console.timeEnd("import glyphs");
  }

  /* ---------- 2) أسماء السور للبحث ---------- */
  console.time("surah aliases");
  const surahs = SRC.prepare("SELECT id, names FROM quran_surah ORDER BY id").all() as { id: number; names: string }[];
  for (const s of surahs) {
    const names = s.names
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length >= 2 && n.length <= 60);
    // إزالة التكرارات مع الحفاظ على الترتيب (أول 14 اسمًا)
    const uniq = [...new Set(names)].slice(0, 14).join("، ");
    if (!uniq) continue;
    await prisma.quranSurah.update({ where: { number: s.id }, data: { aliases: uniq } }).catch(() => undefined);
  }
  console.timeEnd("surah aliases");

  /* ---------- تحقق ---------- */
  const g = await prisma.quranGlyph.count();
  const pages = await prisma.quranGlyph.groupBy({ by: ["pageId"], _count: { id: true } });
  console.log(`✅ QuranGlyph: ${g} rows across ${pages.length} pages`);
  const sample = await prisma.quranSurah.findFirst({ where: { number: 2 }, select: { name: true, aliases: true } });
  console.log("✅ Surah 2 aliases:", sample?.aliases?.slice(0, 80));
}

main()
  .catch((e) => {
    console.error("❌ import failed:", e);
    process.exit(1);
  })
  .finally(() => {
    SRC.close();
    prisma.$disconnect();
  });
