import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.appSetting.findMany();
  const settings: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  }
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  for (const [key, value] of Object.entries(body)) {
    if (key === "key" || key === "value") continue;
    await db.appSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }
  return NextResponse.json({ ok: true });
}
