import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: string; name?: string; reminderTime?: string | null; endDate?: string | null };
  const data: Record<string, unknown> = {};
  if (body.status && ["active", "paused", "finished"].includes(body.status)) data.status = body.status;
  if (body.name) data.name = body.name;
  if (body.reminderTime !== undefined) data.reminderTime = body.reminderTime;
  if (body.endDate !== undefined) data.endDate = body.endDate;
  const plan = await db.readingPlan.update({ where: { id }, data });
  return NextResponse.json({ plan });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.planLog.deleteMany({ where: { planId: id } });
  await db.readingPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
