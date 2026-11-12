import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const favorites = await db.favorite.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { kind, refKey, label, detail } = body as { kind: string; refKey: string; label: string; detail?: string };
  if (!kind || !refKey || !label) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const existing = await db.favorite.findUnique({ where: { kind_refKey: { kind, refKey } } });
  if (existing) return NextResponse.json({ ok: true });
  await db.favorite.create({ data: { kind, refKey, label, detail } });
  return NextResponse.json({ ok: true });
}
