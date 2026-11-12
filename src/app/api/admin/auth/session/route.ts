import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, isDefaultPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** فحص حالة جلسة الإدارة — غير محمي (هو نفسه الفحص) */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ authenticated: false });

  /* P0-AUDIT: إشعار اللوحة ببقاء كلمة المرور الافتراضية لإلزام تغييرها */
  const adminRow = await db.adminUser.findUnique({
    where: { username: user.username },
    select: { passwordHash: true, salt: true },
  });
  return NextResponse.json({
    authenticated: true,
    user,
    defaultPassword: adminRow ? await isDefaultPassword(adminRow) : false,
  });
}
