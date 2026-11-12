import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint used by deployment automation (staging/production).
 * Returns 200 always (HTTP-level liveness); `database` reports SQLite reachability
 * so the deploy script can distinguish full health from degraded state.
 */
export async function GET() {
  let database = "down";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  return NextResponse.json({
    status: "ok",
    database,
    timestamp: new Date().toISOString(),
  });
}
