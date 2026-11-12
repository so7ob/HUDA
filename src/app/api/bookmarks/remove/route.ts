import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { kind, refKey } = (await req.json()) as { kind: string; refKey: string };
  if (!kind || !refKey) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  await db.bookmark.deleteMany({ where: { kind, refKey } });
  return NextResponse.json({ ok: true });
}
