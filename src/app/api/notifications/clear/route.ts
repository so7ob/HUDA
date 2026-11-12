import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  await db.appNotification.deleteMany({});
  return NextResponse.json({ ok: true });
}
