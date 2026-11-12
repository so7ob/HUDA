import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** إدارة المقرئين — يشمل غير المفعّلين */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const reciters = await db.reciter.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json({ reciters });
}

/** إضافة مقرئ جديد — نمط روابط الصوت: https://…/{reciter}/{ayahId}.mp3 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    riwayah?: string;
    style?: string;
    audioUrlTemplate?: string;
    bitrate?: string;
    source?: string;
    license?: string;
  };
  if (!body.name?.trim() || !body.audioUrlTemplate?.trim() || !body.id?.trim()) {
    return NextResponse.json(
      { error: "المعرف والاسم ونمط الرابط مطلوبة — النمط يجب أن يحوي {ayahId}" },
      { status: 400 }
    );
  }
  if (!/\{\s*(ayah|ayahId)\s*\}/.test(body.audioUrlTemplate)) {
    return NextResponse.json({ error: "نمط الرابط يجب أن يحتوي العنصر النائب {ayahId} أو {ayah}" }, { status: 400 });
  }
  const exists = await db.reciter.findUnique({ where: { id: body.id.trim() } });
  if (exists) return NextResponse.json({ error: "المعرّف مستخدم بالفعل" }, { status: 409 });

  const max = await db.reciter.aggregate({ _max: { sortOrder: true } });
  const reciter = await db.reciter.create({
    data: {
      id: body.id.trim(),
      name: body.name.trim(),
      riwayah: body.riwayah?.trim() || "حفص عن عاصم",
      style: body.style?.trim() || "مرتل",
      audioUrlTemplate: body.audioUrlTemplate.trim(),
      bitrate: body.bitrate?.trim() || "128",
      source: body.source?.trim() || "مصدر خارجي",
      license: body.license?.trim() || "متاح للاستخدام غير التجاري",
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });
  await createAudit("create", "Reciter", reciter.id, `إضافة مقرئ: ${reciter.name}`, admin.username);
  return NextResponse.json({ reciter });
}
