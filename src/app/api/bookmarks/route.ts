import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const bookmarks = await db.bookmark.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
  const { kind, refKey, label } = (await req.json()) as { kind: string; refKey: string; label: string };
  if (!kind || !refKey || !label) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const existing = await db.bookmark.findUnique({ where: { kind_refKey: { kind, refKey } } });
  if (!existing) {
    await db.bookmark.create({ data: { kind, refKey, label } });
  }
  return NextResponse.json({ ok: true });
}
