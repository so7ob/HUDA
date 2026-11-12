import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const [booksCount, publishedCount, draftCount, surahsCount, ayahsCount, tafsirCount, recitersCount, topicsCount, plansCount, favoritesCount, sectionsCount, chaptersCount, packagesCount] =
    await Promise.all([
      db.book.count(),
      db.book.count({ where: { status: "published" } }),
      db.book.count({ where: { status: { in: ["draft", "review", "approved"] } } }),
      db.quranSurah.count(),
      db.quranAyah.count(),
      db.tafsirAyah.count(),
      db.reciter.count({ where: { isActive: true } }),
      db.quranTopic.count({ where: { isPublished: true } }),
      db.readingPlan.count(),
      db.favorite.count(),
      db.librarySection.count(),
      db.chapter.count(),
      db.contentPackage.count({ where: { status: "installed" } }),
    ]);
  // توزيع سير النشر على الحالات الخمس
  const statusGroups = await db.book.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus: Record<string, number> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count._all;

  const audit = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({
    stats: {
      booksCount,
      publishedCount,
      pendingCount: draftCount,
      surahsCount,
      ayahsCount,
      tafsirCount,
      recitersCount,
      topicsCount,
      plansCount,
      favoritesCount,
      sectionsCount,
      chaptersCount,
      packagesCount,
      byStatus,
    },
    audit,
  });
}
