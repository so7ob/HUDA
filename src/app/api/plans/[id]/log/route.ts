import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** تسجيل إنجاز يوم في الورد — مع رصد اكتمال الهدف وإصدار إشعار */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { date, done, pagesRead } = (await req.json()) as { date: string; done: boolean; pagesRead?: number };
  if (!date) return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 400 });

  await db.planLog.upsert({
    where: { planId_date: { planId: id, date } },
    update: { done, pagesRead: pagesRead ?? 0 },
    create: { planId: id, date, done, pagesRead: pagesRead ?? 0 },
  });

  // عند الإنجاز: تحقق من اكتمال الخطة (نسبة الصفحات أو الأيام)
  if (done) {
    const plan = await db.readingPlan.findUnique({ where: { id } });
    if (plan) {
      const logs = await db.planLog.findMany({ where: { planId: id } });
      const pagesReadTotal = logs.reduce((acc, l) => acc + l.pagesRead, 0);
      if (plan.targetType === "quran_pages" && plan.totalPages > 0 && pagesReadTotal >= plan.totalPages) {
        await db.readingPlan.update({ where: { id }, data: { status: "finished" } });
        await db.appNotification.create({
          data: { kind: "achievement", title: "اكتمل الهدف 🎉", body: `ما شاء الله! اكتمل ورد «${plan.name}» بنجاح.` },
        });
      } else if (plan.endDate && date >= plan.endDate) {
        await db.readingPlan.update({ where: { id }, data: { status: "finished" } });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
