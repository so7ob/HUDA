import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sections = await db.librarySection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const counts = await db.book.groupBy({
    by: ["sectionId"],
    where: { status: "published" },
    _count: { _all: true },
  });
  const cMap = new Map(counts.map((c) => [c.sectionId, c._count._all]));
  return NextResponse.json({
    sections: sections.map((s) => ({ ...s, bookCount: cMap.get(s.id) ?? 0 })),
  });
}
