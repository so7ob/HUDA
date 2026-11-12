import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const last = await db.lastReading.findUnique({ where: { id: "main" } });
  if (!last) return NextResponse.json({ last: { surah: 1, ayah: 1, page: 1, mode: "list", updatedAt: new Date().toISOString() } });
  const surah = await db.quranSurah.findUnique({ where: { number: last.surah } });
  return NextResponse.json({
    last: {
      ...last,
      surahName: surah?.name ?? "",
      totalPages: 604,
    },
  });
}

export async function POST(req: NextRequest) {
  const { surah, ayah, page, mode } = (await req.json()) as { surah: number; ayah: number; page: number; mode?: string };
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || !Number.isInteger(page)) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  await db.lastReading.upsert({
    where: { id: "main" },
    update: { surah, ayah, page, mode: mode ?? "list", updatedAt: new Date() },
    create: { id: "main", surah, ayah, page, mode: mode ?? "list" },
  });
  return NextResponse.json({ ok: true });
}
