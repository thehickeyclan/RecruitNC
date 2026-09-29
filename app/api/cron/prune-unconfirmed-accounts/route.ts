import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { pruneUnconfirmedAccounts } from "@/lib/prune-unconfirmed-accounts"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/** Daily: delete sign-ups that never confirmed and never signed in within seven days. */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await pruneUnconfirmedAccounts(createAdminClient())
  if (result.capped) {
    console.warn(`[prune-unconfirmed] ${result.candidates} candidates exceeds the per-run cap; nothing deleted - check for a sign-up flood or a confirmation-email outage`)
  }
  if (result.deleted.length) console.info(`[prune-unconfirmed] deleted ${result.deleted.length}: ${result.deleted.join(", ")}`)
  if (result.skipped.length) console.info(`[prune-unconfirmed] kept ${result.skipped.length} tied to real data:`, result.skipped)
  if (result.errors.length) console.error("[prune-unconfirmed] errors:", result.errors.join(" | "))

  return NextResponse.json({
    candidates: result.candidates,
    deleted: result.deleted.length,
    skipped: result.skipped,
    errors: result.errors,
    capped: result.capped,
  })
}
