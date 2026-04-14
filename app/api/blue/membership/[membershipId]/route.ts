import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { pauseBlueSubscription, cancelBlueSubscription, resumeBlueSubscription } from "@/lib/blue-subscription-actions"

export const dynamic = "force-dynamic"

/** Ensure the current user is the payer for this membership. */
async function getMembershipIfPayer(membershipId: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false as const, status: 401 as const, error: "Not authenticated" }
  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from("blue_memberships")
    .select("id, payer_user_id, stripe_subscription_id, status")
    .eq("id", membershipId)
    .single()
  if (fetchErr || !row) return { ok: false as const, status: 404 as const, error: "Membership not found" }
  if (row.payer_user_id !== user.id) return { ok: false as const, status: 403 as const, error: "Not authorized for this membership" }
  return { ok: true as const, membershipId }
}

/** POST: pause or cancel own Blue subscription (user). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const { membershipId } = await params
  if (!membershipId) return NextResponse.json({ error: "membershipId required" }, { status: 400 })

  const auth = await getMembershipIfPayer(membershipId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

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
        : body.action === "resume"
          ? "resume"
          : null
  if (!action) {
    return NextResponse.json({ error: "action required: pause, resume, or cancel" }, { status: 400 })
  }

  if (action === "resume") {
    const result = await resumeBlueSubscription(membershipId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, message: "Subscription resumed. Billing is active again." })
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
