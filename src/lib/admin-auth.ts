/**
 * مصادقة لوحة الإدارة — جلسات كوكي httpOnly مع تشفير scrypt لكلمات المرور.
 * ملاحظة أمنية: لا اعتماد على أي مزود خارجي — يعمل دون إنترنت بالكامل.
 * الافتراضي عند أول تشغيل: admin / admin123 (يُطلب تغييره من اللوحة).
 */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "noor_admin_session";
export const SESSION_DAYS = 7;

/** كلمة المرور الافتراضية لأول تسجيل دخول — تُضبط كتجزئة بعد أول استخدام */
export const BOOTSTRAP_PASSWORD = "admin123";

export type AdminSessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
};

/* ---------- كلمات المرور ---------- */

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { hash, salt: s };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* ---------- الجلسات ---------- */

export async function createSession(user: AdminSessionUser): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.adminSession.create({ data: { token, userId: user.id, actor: user.username, expiresAt } });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.adminSession.deleteMany({ where: { token } });
}

/** تنظيف الجلسات المنتهية (يُستدعى عند كل تحقق) */
async function sweepExpired(): Promise<void> {
  try {
    await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {
    /* غير حرج */
  }
}

/** قراءة الجلسة من الطلب — تعيد المستخدم إن كانت الجلسة صالحة وإلا null */
export async function getSessionUser(req: NextRequest): Promise<AdminSessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role,
  };
}

/** حماية مسارات الإدارة — تعيد المستخدم أو null (يُرجَع 401) */
export async function requireAdmin(req: NextRequest): Promise<AdminSessionUser | null> {
  const user = await getSessionUser(req);
  if (!user) await sweepExpired();
  return user;
}

/** إرفاق كوكي الجلسة على الاستجابة */
export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: false, // بيئة النشر الحالية http — عند النشر خلف Nginx/HTTPS اجعلها true
  });
  return res;
}

/** إزالة كوكي الجلسة */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

/** استجابة 401 موحدة للمسارات المحمية */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "غير مصرح — سجّل الدخول إلى لوحة الإدارة" }, { status: 401 });
}

/**
 * تأمين حساب المالك عند أول استخدام:
 * إن كان الحساب بلا كلمة مرور والبيانات المطابقة هي الافتراضية الموثقة،
 * تُضبط كلمة المرور فورًا كتجزئة scrypt (لا تبقى نصًا صريحًا).
 */
export async function ensureBootstrap(
  user: { id: string; username: string; passwordHash: string | null; salt: string | null },
  password: string
): Promise<boolean> {
  if (user.passwordHash && user.salt) return false;
  if (password !== BOOTSTRAP_PASSWORD) return false;
  const { hash, salt } = hashPassword(password);
  await db.adminUser.update({ where: { id: user.id }, data: { passwordHash: hash, salt } });
  return true;
}
