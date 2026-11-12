import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sectionKey = req.nextUrl.searchParams.get("section");
  let sectionId: string | undefined;
  if (sectionKey) {
    const section = await db.librarySection.findUnique({ where: { key: sectionKey } });
    if (!section) return NextResponse.json({ books: [] });
    sectionId = section.id;
  }
  const books = await db.book.findMany({
    where: { status: "published", ...(sectionId ? { sectionId } : {}) },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  const counts = await db.chapter.groupBy({ by: ["bookId"], _count: { _all: true } });
  const cMap = new Map(counts.map((c) => [c.bookId, c._count._all]));
  const sections = await db.librarySection.findMany();
  const sMap = new Map(sections.map((s) => [s.id, s.title]));
  return NextResponse.json({
    books: books.map((b) => ({ ...b, chapterCount: cMap.get(b.id) ?? 0, sectionTitle: sMap.get(b.sectionId) })),
  });
}
