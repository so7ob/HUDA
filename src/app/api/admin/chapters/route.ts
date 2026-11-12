import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "bookId مطلوب" }, { status: 400 });
  const chapters = await db.chapter.findMany({ where: { bookId }, orderBy: { number: "asc" } });
  return NextResponse.json({ chapters });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const body = (await req.json()) as { bookId: string; title: string; content: string; number?: number };
  if (!body.bookId || !body.title || body.content === undefined) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  const max = await db.chapter.aggregate({ where: { bookId: body.bookId }, _max: { number: true } });
  const number = body.number ?? (max._max.number ?? 0) + 1;
  const chapter = await db.chapter.create({
    data: { bookId: body.bookId, title: body.title, content: body.content, number, status: "published" },
  });
  await createAudit("create", "Chapter", chapter.id, `فصل جديد: ${body.title}`);
  return NextResponse.json({ chapter });
}
