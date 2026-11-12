import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, string | boolean | number>;
  const allowed = ["title", "author", "description", "coverStyle", "edition", "sourceName", "licenseNote", "sectionId", "mediaUrl", "mediaLabel", "isFeatured", "sortOrder"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k];
  const book = await db.book.update({ where: { id }, data });
  await createAudit("update", "Book", id, `تعديل كتاب: ${book.title}`);
  return NextResponse.json({ book });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await db.chapter.deleteMany({ where: { bookId: id } });
  await db.book.delete({ where: { id } });
  await createAudit("delete", "Book", id, `حذف كتاب: ${book.title}`);
  return NextResponse.json({ ok: true });
}
