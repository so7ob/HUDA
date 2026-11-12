/**
 * اختبارات الوحدة — تطبيع العربية (يُستخدم في البحث القرآني)
 * تشغيل: bun test
 */
import { describe, expect, test } from "bun:test";
import {
  alefFlexible,
  arabicMatch,
  normalizeArabic,
  parseQuery,
  stripTashkeel,
  stripUthmaniMarks,
} from "../../src/lib/arabic";

describe("stripTashkeel", () => {
  test("يزيل الحركات ويحفظ الحروف", () => {
    expect(stripTashkeel("ٱلْحَمْدُ")).toBe("ٱلحمد");
  });

  test("يزيل التطويل", () => {
    expect(stripTashkeel("الــحــمــد")).toBe("الحمد");
  });

  test("نص بلا تشكيل يبقى كما هو", () => {
    expect(stripTashkeel("الحمد لله")).toBe("الحمد لله");
  });
});

describe("stripUthmaniMarks", () => {
  test("يزيل علامة الوقف فقط ويُبقي الحروف والحركات", () => {
    // العلامة محذوفة فتبقى مسافة الكلمة الأصلية
    expect(stripUthmaniMarks("مَالِكِ ۚ يَوْمِ")).toBe("مَالِكِ  يَوْمِ");
  });
});

describe("normalizeArabic", () => {
  test("يوحد الهمزات المختلفة إلى ألف", () => {
    expect(normalizeArabic("أَحَدٌ إِلَٰهٌ أَلَا")).toBe(normalizeArabic("احد الاه الا"));
  });

  test("يوحد التاء المربوطة بالهاء", () => {
    expect(normalizeArabic("الجنة")).toBe(normalizeArabic("الجنــة"));
  });

  test("آية الفاتحة مطابقة رغم اختلاف الرسم والتشكيل", () => {
    const a = normalizeArabic("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ");
    const b = normalizeArabic("الحمد لله رب العالمين");
    expect(a).toBe(b);
  });

  test("الهمزة على الألف توحد إلى ألف، والء المجردة تُحذف", () => {
    expect(normalizeArabic("سَأَلَ")).toBe(normalizeArabic("سال"));
    expect(normalizeArabic("رَءُوفٌ")).toBe(normalizeArabic("روف"));
  });

  test("P0-AUDIT: الألف الخنجرية تتحول إلى ألف فتطابق العادي (عالمين)", () => {
    expect(normalizeArabic("ٱلْعَـٰلَمِينَ")).toBe(normalizeArabic("العالمين"));
  });

  test("P0-AUDIT: المطابقة المرنة مع الألف تحل تعارض إله/الاھ وعالمين", () => {
    // «لا إله إلا الله» العادية تطابق المصحفية «لَا إِلَٰهَ إِلَّا ٱللَّهُ»
    const q = normalizeArabic("لا اله الا الله");
    const hay = normalizeArabic("لَا إِلَٰهَ إِلَّا ٱللَّهُ");
    expect(arabicMatch(hay, q)).toBe(true);
    // عالمين: مطابقة تامة (بلا حاجة للمرحلة المرنة)
    expect(arabicMatch(normalizeArabic("ٱلْعَـٰلَمِينَ"), normalizeArabic("عالمين"))).toBe(true);
    // لا إيجاب كاذب: كلمة بلا أي ألف لا تطابق استعلام ألف فقط
    expect(arabicMatch(normalizeArabic("مسلم"), normalizeArabic("ا"))).toBe(false);
  });

  test("يسطّح المسافات الزائدة", () => {
    expect(normalizeArabic("قال   له    لا")).toBe("قال له لا");
  });
});

describe("parseQuery", () => {
  test("يكتشف العبارة المقتبسة", () => {
    const t = parseQuery('"مالك يوم الدين"');
    expect(t.isPhrase).toBe(true);
    expect(t.raw).toBe("مالك يوم الدين");
    expect(t.normalized).toBe("مالك يوم الدين");
  });

  test("يطبّع الاستعلام الحر", () => {
    expect(parseQuery("  المَصِيرُ  ").normalized).toBe(normalizeArabic("المصير"));
  });

  test("الاستعلام الرقمي يبقى صالحًا", () => {
    const t = parseQuery("٢");
    expect(t.raw).toBe("٢");
  });
});
