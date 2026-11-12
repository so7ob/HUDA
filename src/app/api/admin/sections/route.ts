import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const sections = await db.librarySection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { books: true } } },
  });
  return NextResponse.json({
    sections: sections.map((s) => ({ ...s, bookCount: s._count.books })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const body = (await req.json()) as { title: string; icon?: string; color?: string; description?: string };
  if (!body.title) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  const max = await db.librarySection.aggregate({ _max: { sortOrder: true } });
  const section = await db.librarySection.create({
    data: {
      title: body.title,
      key: `section-${Date.now()}`,
      icon: body.icon || "book-open",
      color: body.color || "teal",
      description: body.description || null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  await createAudit("create", "LibrarySection", section.id, `قسم جديد: ${body.title}`);
  return NextResponse.json({ section: { ...section, bookCount: 0 } });
}
