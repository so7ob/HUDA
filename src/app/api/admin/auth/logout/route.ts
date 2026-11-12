import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, destroySession, SESSION_COOKIE } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** تسجيل خروج — إبطال الجلسة وإزالة الكوكي */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
