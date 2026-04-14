import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { pauseBlueSubscription, cancelBlueSubscription, resumeBlueSubscription } from "@/lib/blue-subscription-actions"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** POST: pause, cancel, or delete a Blue subscription (admin). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { membershipId } = await params
  if (!membershipId) return NextResponse.json({ error: "membershipId required" }, { status: 400 })

  let body: { action?: string; resumeAt?: string; atPeriodEnd?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const action =
    body.action === "pause"
      ? "pause"
      : body.action === "cancel"
        ? "cancel"
        : body.action === "delete"
          ? "delete"
          : body.action === "resume"
            ? "resume"
            : null
  if (!action) {
    return NextResponse.json({ error: "action required: pause, resume, cancel, or delete" }, { status: 400 })
  }

  if (action === "resume") {
    const result = await resumeBlueSubscription(membershipId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Subscription resumed." })
  }

  if (action === "pause") {
    const resumeAt = typeof body.resumeAt === "string" ? body.resumeAt.trim() : ""
    if (!resumeAt || !/^\d{4}-\d{2}-\d{2}$/.test(resumeAt)) {
      return NextResponse.json({ error: "resumeAt required (YYYY-MM-DD)" }, { status: 400 })
    }
    const result = await pauseBlueSubscription(membershipId, resumeAt)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Subscription paused. It will resume on " + resumeAt + "." })
  }

  if (action === "cancel") {
    const atPeriodEnd = body.atPeriodEnd !== false
    const result = await cancelBlueSubscription(membershipId, !atPeriodEnd)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({
      success: true,
      message: atPeriodEnd ? "Subscription will cancel at end of billing period." : "Subscription cancelled immediately.",
    })
  }

  if (action === "delete") {
    const result = await cancelBlueSubscription(membershipId, true)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Subscription cancelled and membership ended." })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
