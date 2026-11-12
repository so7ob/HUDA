/**
 * الحد من المحاولات المتكررة — ذاكرة محلية (نموذج أحادي العملية، مناسب لتطبيق SQLite محلي).
 * P0-AUDIT: يُطبَّق على تسجيل دخول الإدارة لمقاومة هجمات القوة الغاشمة.
 * ملاحظة: عند التشغيل خلف عدة نسخ/عمليات يلزم مخزن مشترك (SQLite أو Redis) — موثق في سجل الفجوات.
 */

type Bucket = { count: number; resetAt: number; blockedUntil?: number };

const buckets = new Map<string, Bucket>();

/** تنظيف دوري للمفاتيح المنتهية لمنع تضخم الذاكرة */
function sweep(now: number): void {
  if (buckets.size < 512) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now && (!b.blockedUntil || b.blockedUntil < now)) buckets.delete(k);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * تسجيل محاولة. increase=false للفحص دون عدّ (مثلاً محاولات ناجحة).
 * maxAttempts: الحد الأقصى للفشل داخل النافذة، windowSec: النافذة، lockSec: مدة القفل بعد التجاوز.
 */
export function rateLimit(
  key: string,
  opts: { maxAttempts: number; windowSec: number; lockSec: number; failed: boolean }
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);

  if (b?.blockedUntil && b.blockedUntil > now) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  }

  let bucket = b;
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + opts.windowSec * 1000 };
    buckets.set(key, bucket);
  }

  if (opts.failed) bucket.count += 1;

  if (bucket.count >= opts.maxAttempts) {
    bucket.blockedUntil = now + opts.lockSec * 1000;
    bucket.count = 0; // بعد انتهاء القفل تبدأ نافذة جديدة
    bucket.resetAt = bucket.blockedUntil;
    return { allowed: false, remaining: 0, retryAfterSec: opts.lockSec };
  }

  return { allowed: true, remaining: opts.maxAttempts - bucket.count, retryAfterSec: 0 };
}

/** اختبارات فقط — تصفير الحالة */
export function __resetRateLimit(): void {
  buckets.clear();
}
