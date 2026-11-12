import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const books = await db.book.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  const counts = await db.chapter.groupBy({ by: ["bookId"], _count: { _all: true } });
  const cMap = new Map(counts.map((c) => [c.bookId, c._count._all]));
  const sections = await db.librarySection.findMany();
  const sMap = new Map(sections.map((s) => [s.id, s.title]));
  return NextResponse.json({
    books: books.map((b) => ({ ...b, chapterCount: cMap.get(b.id) ?? 0, sectionTitle: sMap.get(b.sectionId) })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const body = (await req.json()) as Record<string, string>;
  const { sectionId, title, author, description, coverStyle, edition, sourceName, licenseNote } = body;
  if (!sectionId || !title) return NextResponse.json({ error: "القسم والعنوان مطلوبان" }, { status: 400 });
  const book = await db.book.create({
    data: {
      sectionId,
      title,
      author: author || null,
      description: description || null,
      coverStyle: coverStyle || "teal",
      edition: edition || null,
      sourceName: sourceName || null,
      licenseNote: licenseNote || null,
      status: "draft",
    },
  });
  await createAudit("create", "Book", book.id, `إنشاء كتاب: ${title}`);
  return NextResponse.json({ book });
}
