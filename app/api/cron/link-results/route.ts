import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { linkResults } from "@/lib/identity/link-results"

export const dynamic = "force-dynamic"
export const maxDuration = 120

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Hourly: link results imported, and profiles created or changed, in the last three hours.
 *
 * Profiles read results through stored links, so anything imported by script or pasted SQL - or a
 * profile created after its results were loaded - would not show until it is linked. The window
 * overlaps the schedule so a slow or missed run is covered by the next.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  try {
    const result = await linkResults(createAdminClient(), { since })
    const linked = Object.values(result.summary).reduce((t, s) => t + (s.linked ?? 0), 0)
    if (result.review.length) console.info(`[link-results] ${result.review.length} rows need review at /admin/identity-review`)
    return NextResponse.json({ since, linked, review: result.review.length, written: result.written, removed: result.removed })
  } catch (e) {
    console.error("[link-results]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
