import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runResumeDueSubscriptions } from "@/lib/blue-subscription-actions"

export const dynamic = "force-dynamic"

/** POST: Run resume for paused memberships where resume_at <= today. Call from cron or on profile load. */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const { resumed, errors } = await runResumeDueSubscriptions()
  return NextResponse.json({ success: true, resumed, errors })
}
