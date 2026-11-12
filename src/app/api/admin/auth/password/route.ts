import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  requireAdmin,
  unauthorized,
  verifyPassword,
} from "@/lib/admin-auth";
import { createAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** تغيير كلمة المرور — يتطلب الجلسة وكلمة المرور الحالية */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "كلمة المرور الحالية والجديدة مطلوبتان" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
  }

  const user = await db.adminUser.findUnique({ where: { id: admin.id } });
  if (!user) return unauthorized();

  if (user.passwordHash && user.salt) {
    if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }
  } else if (currentPassword !== "admin123") {
    // حساب بلا كلمة مرور بعد — يُقبل الافتراضي الموثق فقط
    return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
  }

  const { hash, salt } = hashPassword(newPassword);
  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: hash, salt } });
  await createAudit("update", "AdminUser", admin.id, "تغيير كلمة المرور", admin.username);
  return NextResponse.json({ ok: true });
}
