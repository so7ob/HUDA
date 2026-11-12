import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const surahs = await db.quranSurah.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json({ surahs });
}
