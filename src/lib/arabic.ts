/**
 * أدوات معالجة النصوص العربية للبحث
 * التنبيه: التطبيع يُطبَّق على فهرس/مقارنة البحث فقط — النصوص الأصلية لا تُعدَّل.
 */
import { createElement, type ReactNode } from "react";

/** إزالة التشكيل (الحركات) */
export function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, ""); // حركات + مدة صغيرة + تطويل
}

/** إزالة علامات الآيات الخاصة بالرسم العثماني (لسان، مدة، سكون صغير...) */
export function stripUthmaniMarks(text: string): string {
  return text.replace(/[\u06D6-\u06ED\u0640\u06E1\u0670]/g, "");
}

/** تطبيع شامل: همزات، تاء مربوطة، ألف، ياء */
export function normalizeArabic(text: string): string {
  let t = text;
  t = stripTashkeel(t);
  t = stripUthmaniMarks(t);
  // توحيد الهمزات
  t = t.replace(/[\u0622\u0623\u0625\u0627\u0671]/g, "ا");
  t = t.replace(/\u0624/g, "و"); // ؤ → و
  t = t.replace(/\u0626/g, "ي"); // ئ → ي
  t = t.replace(/\u0621/g, ""); // ء مجردة → حذف عند المطابقة
  // التاء المربوطة → هاء
  t = t.replace(/\u0629/g, "ه");
  // الياء/الألف المقصورة
  t = t.replace(/\u0649/g, "ي");
  t = t.replace(/\u064A/g, "ي");
  // إزالة المسافات الزائدة
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export interface SearchTokens {
  raw: string;
  normalized: string;
  isPhrase: boolean;
}

export function parseQuery(q: string): SearchTokens {
  const raw = q.trim().replace(/\s+/g, " ");
  const isPhrase = raw.startsWith('"') && raw.endsWith('"') && raw.length > 2;
  return {
    raw: isPhrase ? raw.slice(1, -1) : raw,
    normalized: normalizeArabic(isPhrase ? raw.slice(1, -1) : raw),
    isPhrase,
  };
}

/** هل تطابق نصٌّ (بأصله المُشكَّل) استعلامًا مُطبَّعًا؟ مع إبراز المواضع */
export function highlightMatches(original: string, queryNorm: string): ReactNode[] {
  if (!queryNorm) return [original];
  const norm = normalizeArabic(original);
  const parts: ReactNode[] = [];
  let idx = 0;
  let found = false;
  const lower = norm.toLowerCase();
  let from = lower.indexOf(queryNorm);
  if (from === -1) return [original];
  found = true;
  // الحصول على مواضع حروف الـ norm مقابل الـ original
  // نبني خريطة: لكل حرف مطبَّع مؤشره في النص الأصلي
  const map: number[] = [];
  let qi = 0;
  for (let i = 0; i < original.length; i++) {
    const c = normalizeArabic(original[i]);
    if (c.length > 0) {
      for (let k = 0; k < c.length; k++) map.push(i);
    } else {
      // حرف حُذف في التطبيع (تشكيل)
    }
  }
  void found;
  const startChar = map[from];
  let endChar = map[Math.min(from + queryNorm.length - 1, map.length - 1)];
  if (startChar === undefined || endChar === undefined) return [original];
  if (startChar > 0) parts.push(original.slice(0, startChar));
  parts.push(
    createElement(
      "mark",
      { key: "m", className: "search-hit" },
      original.slice(startChar, endChar + 1)
    )
  );
  if (endChar + 1 < original.length) parts.push(original.slice(endChar + 1));
  void idx;
  return parts;
}
