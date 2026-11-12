import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** تعديل مقرئ — تفعيل/إيقاف/تعديل البيانات/تعيين افتراضي */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    riwayah?: string;
    style?: string;
    audioUrlTemplate?: string;
    bitrate?: string;
    source?: string;
    license?: string;
    isActive?: boolean;
    isDefault?: boolean;
  };

  const data: Record<string, unknown> = {};
  for (const k of ["name", "riwayah", "style", "audioUrlTemplate", "bitrate", "source", "license", "isActive"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (data.audioUrlTemplate && !/\{\s*(ayah|ayahId)\s*\}/.test(data.audioUrlTemplate as string)) {
    return NextResponse.json({ error: "نمط الرابط يجب أن يحتوي العنصر النائب {ayahId} أو {ayah}" }, { status: 400 });
  }

  // تعيين افتراضي: يُزال الافتراضي السابق ويُفعَّل المقرئ الجديد
  if (body.isDefault) {
    await db.reciter.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    data.isDefault = true;
    data.isActive = true;
  }

  const reciter = await db.reciter.update({ where: { id }, data });
  await createAudit("update", "Reciter", id, `تعديل مقرئ: ${reciter.name}`, admin.username);
  return NextResponse.json({ reciter });
}

/** حذف مقرئ — غير المقرئ الافتراضي */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const reciter = await db.reciter.findUnique({ where: { id } });
  if (!reciter) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (reciter.isDefault) {
    return NextResponse.json({ error: "لا يمكن حذف المقرئ الافتراضي — عيّن مقرئًا آخر افتراضيًا أولًا" }, { status: 409 });
  }
  await db.reciter.delete({ where: { id } });
  await createAudit("delete", "Reciter", id, `حذف مقرئ: ${reciter.name}`, admin.username);
  return NextResponse.json({ ok: true });
}
