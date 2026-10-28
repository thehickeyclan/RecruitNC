import { NextResponse, type NextRequest } from "next/server"

import { sendDueReminders } from "@/lib/recruiting/reminders-send"
import { createAdminClient } from "@/lib/supabase/admin"
import { scheduledJobsOff, skippedJob } from "@/lib/scheduled-jobs"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Every 15 minutes: the reminders families scheduled in the Command Center
 * (lib/recruiting/reminders-send.ts). It only counts until FAMILY_REMINDER_SEND=1 is set, Matt's
 * go-ahead on the wording.
 */
export async function GET(request: NextRequest) {
  if (scheduledJobsOff()) return skippedJob()
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const dryRun = process.env.FAMILY_REMINDER_SEND !== "1"
  try {
    const result = await sendDueReminders(createAdminClient(), { dryRun })
    return NextResponse.json({ ok: true, dryRun, ...result })
  } catch (error) {
    console.error("[cron/family-reminders]", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "failed" }, { status: 500 })
  }
}
