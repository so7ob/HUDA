import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  await db.appNotification.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
