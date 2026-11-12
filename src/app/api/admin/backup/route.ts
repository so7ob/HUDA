import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** نسخة احتياطية كاملة من بيانات الاستخدام الشخصية والمحتوى الإداري (JSON) */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const [favorites, bookmarks, plans, planLogs, lastReading, settings, sections, books, chapters, topics] =
    await Promise.all([
      db.favorite.findMany(),
      db.bookmark.findMany(),
      db.readingPlan.findMany(),
      db.planLog.findMany(),
      db.lastReading.findUnique({ where: { id: "main" } }),
      db.appSetting.findMany(),
      db.librarySection.findMany(),
      db.book.findMany(),
      db.chapter.findMany(),
      db.quranTopic.findMany(),
    ]);
  return NextResponse.json({
    ok: true,
    data: {
      version: 1,
      exportedAt: new Date().toISOString(),
      favorites,
      bookmarks,
      plans,
      planLogs,
      lastReading,
      settings,
      sections,
      books,
      chapters,
      topics,
      // النص القرآني لا يُصدَّر هنا — مرجعي ثابت يُستورد عبر سكربت التغذية الموثق
    },
  });
}
