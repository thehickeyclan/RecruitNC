import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { backfillMissingProfiles } from "@/lib/profile-backfill"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Nightly repair for accounts whose profile row never got written.
 *
 * Signup creates the account first and the profile second, and carries on if the second fails —
 * correct, because the account already exists and failing would leave somebody unable to retry
 * with an email that is now taken. This is where that debt gets paid, at a time it costs nobody.
 *
 * A quiet night logs nothing. A night that repairs several means something upstream broke, and
 * that is worth seeing in the logs rather than discovering a year later.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await backfillMissingProfiles(createAdminClient())

  if (result.errors.length > 0) {
    console.error("[backfill-profiles] errors:", result.errors.join(" | "))
  }
  if (result.created > 0) {
    console.warn(
      `[backfill-profiles] repaired ${result.created} account(s) with no profile — signup is dropping profile writes: ${result.createdEmails.join(", ")}`,
    )
  }

  return NextResponse.json(result)
}
