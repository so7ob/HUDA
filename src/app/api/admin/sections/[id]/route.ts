import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = (await req.json()) as { title?: string; icon?: string; color?: string; isActive?: boolean; sortOrder?: number };
  const data: Record<string, unknown> = {};
  for (const k of ["title", "icon", "color", "isActive", "sortOrder"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  const section = await db.librarySection.update({ where: { id }, data });
  await createAudit("update", "LibrarySection", id, `تعديل قسم: ${section.title}`, admin.username);
  return NextResponse.json({ section });
}

/** حذف قسم — مسموح فقط إن كان فارغًا من الكتب (حماية المحتوى) */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const booksCount = await db.book.count({ where: { sectionId: id } });
  if (booksCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف القسم — يحتوي ${booksCount} كتابًا. انقل الكتب أو احذفها أولًا.` },
      { status: 409 }
    );
  }
  const section = await db.librarySection.delete({ where: { id } });
  await createAudit("delete", "LibrarySection", id, `حذف قسم فارغ: ${section.title}`, admin.username);
  return NextResponse.json({ ok: true });
}
