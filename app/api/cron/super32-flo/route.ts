/** Super 32 HQ auto-update: pulls Flo's results feed every 2 minutes during the event. */
import { NextResponse, type NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { pullAndPublish, pullWindowOpen } from "@/lib/super32-live/auto-pull"
import { scheduledJobsOff, skippedJob } from "@/lib/scheduled-jobs"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (scheduledJobsOff()) return skippedJob()
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!pullWindowOpen()) return NextResponse.json({ status: "outside the event window" })
  // Paused 24 Oct 5:20pm ET: rebuilds every 2 minutes overloaded the Nano database. Resumes once
  // credentials are cached instead of re-read on every build.
  if (process.env.SUPER32_AUTO_PULL !== "1") return NextResponse.json({ status: "paused" })
  try {
    const out = await pullAndPublish(createAdminClient())
    if (out.status === "published") revalidateTag("super32-live")
    console.log("[super32-flo]", JSON.stringify(out))
    return NextResponse.json(out)
  } catch (e) {
    console.error("[super32-flo] failed", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
