import { NextResponse, type NextRequest } from "next/server"

import { sendQuestionnaireReminders } from "@/lib/recruiting/questionnaire-reminders"
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
 * Sunday evenings: the interest-form nudge (lib/recruiting/questionnaire-reminders.ts). It only
 * counts until QUESTIONNAIRE_REMINDER_SEND=1 is set, Matt's go-ahead on the wording.
 */
export async function GET(request: NextRequest) {
  if (scheduledJobsOff()) return skippedJob()
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const dryRun = process.env.QUESTIONNAIRE_REMINDER_SEND !== "1"
  try {
    const result = await sendQuestionnaireReminders(createAdminClient(), { dryRun })
    return NextResponse.json({ ok: true, dryRun, ...result })
  } catch (error) {
    console.error("[cron/questionnaire-reminders]", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "failed" }, { status: 500 })
  }
}
