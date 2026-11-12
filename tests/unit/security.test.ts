/**
 * اختبارات الوحدة — مصادقة الإدارة (تجزئة scrypt والتحقق) والحد من المحاولات
 * تشغيل: bun test
 */
import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "../../src/lib/admin-auth";
import { __resetRateLimit, rateLimit } from "../../src/lib/rate-limit";

describe("hashPassword / verifyPassword", () => {
  test("الجولة الكاملة: تجزئة ثم تحقق صحيح", () => {
    const { hash, salt } = hashPassword("s3cret-pass");
    expect(hash).not.toContain("s3cret"); // لا نص صريح داخل التجزئة
    expect(verifyPassword("s3cret-pass", salt, hash)).toBe(true);
  });

  test("كلمة مرور خاطئة تُرفض", () => {
    const { hash, salt } = hashPassword("right");
    expect(verifyPassword("wrong", salt, hash)).toBe(false);
  });

  test("الأملاح المختلفة تعطي تجزئات مختلفة لنفس الكلمة", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    expect(a.hash).not.toBe(b.hash);
    expect(a.salt).not.toBe(b.salt);
  });

  test("تجزئة تالفة تُرفض دون رمي استثناء", () => {
    const { salt } = hashPassword("x");
    expect(verifyPassword("x", salt, "not-hex!")).toBe(false);
  });
});

describe("rateLimit (بوابة دخول الإدارة)", () => {
  test("يسمح ضمن الحد ويحسب المتبقي", () => {
    __resetRateLimit();
    const r1 = rateLimit("k1", { maxAttempts: 3, windowSec: 60, lockSec: 30, failed: true });
    const r2 = rateLimit("k1", { maxAttempts: 3, windowSec: 60, lockSec: 30, failed: true });
    expect(r1.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  test("يُقفل بعد تجاوز الحد الأقصى", () => {
    __resetRateLimit();
    for (let i = 0; i < 3; i++) {
      rateLimit("k2", { maxAttempts: 3, windowSec: 60, lockSec: 30, failed: true });
    }
    const blocked = rateLimit("k2", { maxAttempts: 3, windowSec: 60, lockSec: 30, failed: true });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  test("المفاتيح المستقلة لا تؤثر على بعضها", () => {
    __resetRateLimit();
    rateLimit("a", { maxAttempts: 1, windowSec: 60, lockSec: 30, failed: true }); // أ: يُقفل فورًا
    const other = rateLimit("b", { maxAttempts: 2, windowSec: 60, lockSec: 30, failed: true });
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(1);
  });

  test("النجاح لا يزيد العدّاد", () => {
    __resetRateLimit();
    const ok = rateLimit("c", { maxAttempts: 2, windowSec: 60, lockSec: 30, failed: false });
    expect(ok.remaining).toBe(2);
    const r = rateLimit("c", { maxAttempts: 2, windowSec: 60, lockSec: 30, failed: true });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(1);
  });
});
