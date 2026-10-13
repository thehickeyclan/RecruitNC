import { NextResponse, type NextRequest } from "next/server"

import { buildWentHereSnapshot } from "@/lib/college-programs/went-here"
import { saveWentHereSnapshot } from "@/lib/college-programs/went-here-snapshot"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Every six hours: work out which NC wrestlers committed to which college and what they had won,
 * and save it (lib/college-programs/went-here-snapshot.ts) so a school's card reads it instead of
 * building it.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const started = Date.now()
  try {
    const snapshot = await buildWentHereSnapshot(createAdminClient())
    const saved = await saveWentHereSnapshot(snapshot)
    return NextResponse.json({
      ok: true,
      commits: snapshot.commits.length,
      schools: new Set(snapshot.commits.map((c) => c.schoolId)).size,
      bytes: saved.bytes,
      seconds: Math.round((Date.now() - started) / 1000),
    })
  } catch (e) {
    console.error("[college-went-here]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
