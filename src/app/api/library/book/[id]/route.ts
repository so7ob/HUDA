import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book || book.status !== "published") {
    return NextResponse.json({ error: "الكتاب غير متاح" }, { status: 404 });
  }
  const chapters = await db.chapter.findMany({
    where: { bookId: id, status: "published" },
    orderBy: { number: "asc" },
  });
  return NextResponse.json({ book: { ...book, chapterCount: chapters.length }, chapters });
}
