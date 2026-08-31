import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Records that a signed-in person is using the iPhone app.
 *
 * Apple gives no identity for a download and never will, so "who has the app" is not a question
 * that can be answered. "Who is signed in and using it" can be, and is the useful half.
 *
 * The signal is an explicit header from the app. A bearer token would be the obvious shortcut and
 * would be wrong: several pages on the website send one too.
 *
 * Two things this does not measure, and it is worth being honest about both. Most of the app works
 * signed out — the field, brackets, commitments, the calendar, the club finder — so somebody can
 * use it for a month and never appear here. And a stamp means "was using the app", never "has it
 * installed": an uninstall leaves no trace.
 */

export const CLIENT_HEADER = "x-recruitnc-client"
const APP_CLIENT = "recruitnc-app"

/** One write per user per hour at most. This runs on every authenticated app request. */
const STAMP_EVERY_MS = 60 * 60 * 1000

export function isAppRequest(request: NextRequest): boolean {
  return (request.headers.get(CLIENT_HEADER) ?? "").toLowerCase().startsWith(APP_CLIENT)
}

/**
 * Stamps last_app_seen_at, at most hourly, and never at the cost of the request.
 *
 * The staleness check is part of the update rather than a read beforehand, so this is one
 * statement rather than two. Failures are swallowed on purpose: nobody's bracket should fail to
 * load because an analytics column would not write, and a missing column before the migration is
 * run must not break every app request.
 */
export async function noteAppUsage(request: NextRequest, userId: string | null): Promise<void> {
  if (!userId || !isAppRequest(request)) return

  const cutoff = new Date(Date.now() - STAMP_EVERY_MS).toISOString()
  try {
    await createAdminClient()
      .from("user_profiles")
      .update({ last_app_seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .or(`last_app_seen_at.is.null,last_app_seen_at.lt.${cutoff}`)
  } catch {
    // Deliberately silent. See above.
  }
}
