import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** فحص حالة جلسة الإدارة — غير محمي (هو نفسه الفحص) */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, user });
}
