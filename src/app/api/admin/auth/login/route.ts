import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  attachSessionCookie,
  createSession,
  ensureBootstrap,
  isDefaultPassword,
  unauthorized,
  verifyPassword,
} from "@/lib/admin-auth";
import { createAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * تسجيل دخول لوحة الإدارة — يضبط كوكي جلسة httpOnly صالح 7 أيام.
 * P0-AUDIT: حدّ من المحاولات المتكررة — 5 محاولات فاشلة كل 15 دقيقة تؤدي إلى قفل دقيقتين (لكل مستخدم+IP).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const body0 = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = body0.username?.trim() ?? "";
  const password = body0.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const rl = rateLimit(`admin-login:${username}:${ip}`, {
    maxAttempts: 5,
    windowSec: 15 * 60,
    lockSec: 120,
    failed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `محاولات كثيرة — أعد المحاولة بعد ${rl.retryAfterSec} ثانية` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const user = await db.adminUser.findUnique({ where: { username } });
  if (!user) return unauthorized();

  // أول تشغيل: ضبط كلمة المرور الافتراضية الموثقة كتجزئة
  let valid = false;
  if (user.passwordHash && user.salt) {
    valid = verifyPassword(password, user.salt, user.passwordHash);
  } else {
    valid = await ensureBootstrap(user, password);
  }
  if (!valid) return unauthorized();

  const sessionUser = { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
  const token = await createSession(sessionUser);
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createAudit("update", "AdminUser", user.id, `تسجيل دخول: ${user.displayName}`, user.username);

  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, displayName: user.displayName, role: user.role },
    mustChangePassword: await isDefaultPassword(user),
  });
  return attachSessionCookie(res, token);
}
