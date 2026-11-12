import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** حساب تسمية الهدف بدقة لعرضها في القوائم */
async function targetLabel(targetType: string, targetRef: string): Promise<string> {
  try {
    const ref = JSON.parse(targetRef) as Record<string, number | string>;
    if (targetType === "quran_surah") {
      const s = await db.quranSurah.findUnique({ where: { number: Number(ref.surah) } });
      return s ? `سورة ${s.name}` : "سورة";
    }
    if (targetType === "quran_range") {
      const from = `${await surahName(Number(ref.fromSurah))} ${ref.fromAyah}`;
      const to = `${await surahName(Number(ref.toSurah))} ${ref.toAyah}`;
      return `من ${from} إلى ${to}`;
    }
    if (targetType === "quran_pages") return `${ref.pages} صفحة من المصحف`;
    if (targetType === "book") {
      const b = await db.book.findUnique({ where: { id: String(ref.bookId) } });
      return b ? `كتاب: ${b.title}` : "كتاب";
    }
  } catch {
    /* تجاهل */
  }
  return "هدف مخصص";
}

async function surahName(n: number): Promise<string> {
  const s = await db.quranSurah.findUnique({ where: { number: n } });
  return s ? `${s.name} ${n}` : String(n);
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const plans = await db.readingPlan.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  const today = new Date().toISOString().slice(0, 10);
  const logs = await db.planLog.findMany({ where: { date: today } });
  const todayMap = new Map(logs.map((l) => [l.planId, l.done]));

  const enriched = await Promise.all(
    plans.map(async (p) => {
      const allLogs = await db.planLog.findMany({ where: { planId: p.id } });
      const doneDays = allLogs.filter((l) => l.done).length;
      const pagesRead = allLogs.reduce((acc, l) => acc + l.pagesRead, 0);
      let totalDays = 1;
      if (p.endDate) {
        const d1 = new Date(p.startDate);
        const d2 = new Date(p.endDate);
        totalDays = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1);
      }
      return {
        ...p,
        doneDays,
        totalDays,
        pagesRead,
        todayDone: todayMap.get(p.id) ?? false,
        targetLabel: await targetLabel(p.targetType, p.targetRef),
      };
    })
  );
  return NextResponse.json({ plans: enriched });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { kind, name, targetType, targetRef, totalPages, startDate, endDate, reminderTime, repeatKind } = body as Record<string, string>;
  if (!name || !targetType || !targetRef || !startDate) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  const plan = await db.readingPlan.create({
    data: {
      kind: kind ?? "wird",
      name,
      targetType,
      targetRef,
      totalPages: Number(totalPages) || 0,
      startDate,
      endDate: endDate || null,
      reminderTime: reminderTime || null,
      repeatKind: repeatKind || "daily",
    },
  });
  if (reminderTime) {
    await createAudit("create", "ReadingPlan", plan.id, `ورد جديد: ${name} (تذكير ${reminderTime})`);
  }
  return NextResponse.json({ plan });
}
