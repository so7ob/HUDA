import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  attachSessionCookie,
  createSession,
  ensureBootstrap,
  unauthorized,
  verifyPassword,
} from "@/lib/admin-auth";
import { createAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** تسجيل دخول لوحة الإدارة — يضبط كوكي جلسة httpOnly صالح 7 أيام */
export async function POST(req: NextRequest) {
  const { username, password } = (await req.json()) as { username?: string; password?: string };
  if (!username || !password) {
    return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const user = await db.adminUser.findUnique({ where: { username: username.trim() } });
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
  });
  return attachSessionCookie(res, token);
}
