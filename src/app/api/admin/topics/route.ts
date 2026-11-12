import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * قائمة المواضيع للوحة الإدارة — تشمل غير المنشور مع حالة النشر.
 * ملاحظة أمان: النص القرآني المعتمد لا يُعدَّل من هنا — الاستيراد عبر سكربت التغذية الموثق فقط.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const topics = await db.quranTopic.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      description: t.description,
      ayahCount: t.ayahCount,
      isPublished: t.isPublished,
      sortOrder: t.sortOrder,
    })),
  });
}

/** إنشاء موضوع جديد يدخل الفهرس الموضوعي — الآيات تُضاف بعد ذلك بالتحقق من مصحفها */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { title, description } = (await req.json()) as { title?: string; description?: string };
  if (!title?.trim()) return NextResponse.json({ error: "عنوان الموضوع مطلوب" }, { status: 400 });

  const max = await db.quranTopic.aggregate({ _max: { sortOrder: true } });
  // مفتاح فريد من العنوان (لاتيني مبسط) مع طابع زمني لضمان التفرد
  const key = `topic-${Date.now().toString(36)}`;
  const topic = await db.quranTopic.create({
    data: {
      key,
      title: title.trim(),
      description: description?.trim() || null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      isPublished: false, // ينشر يدويًا بعد إضافة آياته ومراجعتها
      ayahCount: 0,
    },
  });
  await createAudit("create", "QuranTopic", topic.id, `موضوع جديد: ${topic.title}`, admin.username);
  return NextResponse.json({ topic });
}
