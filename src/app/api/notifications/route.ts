import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const notifications = await db.appNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  const { title, body, kind, scheduledAt, fireAt } = (await req.json()) as Record<string, string>;
  if (!title || !body) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  await db.appNotification.create({
    data: {
      title,
      body,
      kind: kind ?? "reminder",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      fireAt: fireAt ? new Date(fireAt) : null,
    },
  });
  return NextResponse.json({ ok: true });
}
