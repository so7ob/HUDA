import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** تصدير بيانات المستخدم الشخصية (خصوصية — GDPR-style) */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const [favorites, bookmarks, plans, planLogs, lastReading, settings, downloads] = await Promise.all([
    db.favorite.findMany(),
    db.bookmark.findMany(),
    db.readingPlan.findMany(),
    db.planLog.findMany(),
    db.lastReading.findUnique({ where: { id: "main" } }),
    db.appSetting.findMany(),
    db.downloadedRecitation.findMany(),
  ]);
  return NextResponse.json({
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      profile: { userName: "محفوظ محليًا" },
      favorites,
      bookmarks,
      plans,
      planLogs,
      lastReading,
      settings,
      downloads,
    },
  });
}
