import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ayahAudioUrl } from "@/lib/audio-store";

/**
 * Proxy داخلي لتلاوات القرآن — Issue #9
 * ============================================================
 * CDN الخارجي (cdn.islamic.network) لا يرسل ترويسات CORS،
 * لذا جلب ملف MP3 كـ Blob من المتصفح مباشرةً محجوب.
 * هذا المسار يمرر الملف من الخادم بنفس الأصل:
 *   GET /api/audio/{ayahId}?reciter={reciterId}
 * - ayahId: الرقم العالمي للآية (1..6236) — أرقام فقط.
 * - reciter: اختياري — افتراضيًا المقرئ الافتراضي النشط.
 * - لا يخزن الخادم الملفات (تمرير مباشر) + ترويسة تخزين
 *   مؤقت طويلة للمتصفح (الملفات غير قابلة للتغير).
 */

export const dynamic = "force-dynamic";

const MAX_GLOBAL_AYAH = 6236;

export async function GET(req: NextRequest, ctx: { params: Promise<{ ayahId: string }> }) {
  const { ayahId } = await ctx.params;
  const n = Number(ayahId);
  if (!/^\d+$/.test(ayahId) || !Number.isInteger(n) || n < 1 || n > MAX_GLOBAL_AYAH) {
    return NextResponse.json({ error: "رقم آية غير صالح" }, { status: 400 });
  }

  let reciterId = req.nextUrl.searchParams.get("reciter") ?? "";
  if (!reciterId) {
    const fallback = await db.reciter.findFirst({ where: { isDefault: true, isActive: true } });
    reciterId = fallback?.id ?? "ar.alafasy";
  }
  const reciter = await db.reciter.findUnique({ where: { id: reciterId } });
  if (!reciter || !reciter.isActive) {
    return NextResponse.json({ error: "المقرئ غير موجود" }, { status: 404 });
  }

  const target = ayahAudioUrl(reciter.audioUrlTemplate, reciter.id, n);
  if (!/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: "قالب رابط التلاوة غير صالح" }, { status: 500 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { signal: req.signal, cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "تعذر الوصول إلى مصدر التلاوة" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "تعذر جلب ملف التلاوة" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "audio/mpeg");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(upstream.body, { status: 200, headers });
}
