import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildClassPositionFloors, saveClassPositionFloors } from "@/lib/rankings/class-position-floors"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Daily: build the rated classes' boards (NC and SC men) and save each wrestler's class-position
 * star floor (lib/rankings/class-position-floors.ts), so profiles and reports can read it.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const started = Date.now()
  try {
    const snapshot = await buildClassPositionFloors(createAdminClient())
    const saved = await saveClassPositionFloors(snapshot)
    return NextResponse.json({
      ok: true,
      wrestlers: Object.keys(snapshot.floors).length,
      bytes: saved.bytes,
      seconds: Math.round((Date.now() - started) / 1000),
    })
  } catch (e) {
    console.error("[class-position-floors]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
