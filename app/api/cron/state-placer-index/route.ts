import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildStatePlacerIndex } from "@/lib/state-placers"
import { saveStatePlacerSnapshot } from "@/lib/state-placer-snapshot"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Every six hours: build the all-states placer index and save it (lib/state-placer-snapshot.ts),
 * so profiles, significant wins and scouting reports read it instead of building it themselves.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const started = Date.now()
  try {
    const now = new Date()
    const index = await buildStatePlacerIndex(createAdminClient(), now, { outOfState: true })
    const saved = await saveStatePlacerSnapshot(index, now.getFullYear())
    return NextResponse.json({
      ok: true,
      placers: index.statePlacers.length,
      bytes: saved.bytes,
      seconds: Math.round((Date.now() - started) / 1000),
    })
  } catch (e) {
    console.error("[state-placer-index]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
