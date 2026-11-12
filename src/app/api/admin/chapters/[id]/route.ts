import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAudit } from "@/lib/audit";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = (await req.json()) as { title?: string; content?: string };
  const data: Record<string, unknown> = {};
  if (body.title) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  const chapter = await db.chapter.update({ where: { id }, data });
  await createAudit("update", "Chapter", id, `تعديل فصل: ${chapter.title}`, admin.username);
  return NextResponse.json({ chapter });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const chapter = await db.chapter.delete({ where: { id } });
  await createAudit("delete", "Chapter", id, `حذف فصل: ${chapter.title}`, admin.username);
  return NextResponse.json({ ok: true });
}
