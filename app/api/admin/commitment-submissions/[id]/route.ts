import { type NextRequest, NextResponse } from "next/server"
import { adminGate } from "@/lib/admin-gate"
import { createAdminClient } from "@/lib/supabase/admin"
import { approveSubmission, rejectSubmission } from "@/lib/commitments/apply"

/**
 * Approve or reject from the admin list. Approving used to flip the status and nothing else, so an
 * approved commitment never reached the profile; it now does exactly what the texted link does.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGate()
  if (denied) return denied
  const { id } = await params
  const { status } = (await request.json().catch(() => ({}))) as { status?: string }
  const admin = createAdminClient()

  if (status === "approved") {
    const outcome = await approveSubmission(admin, id)
    return outcome.ok ? NextResponse.json({ success: true, ...outcome }) : NextResponse.json({ error: outcome.error }, { status: outcome.status })
  }
  if (status === "rejected") {
    const out = await rejectSubmission(admin, id)
    return out.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: out.error }, { status: 500 })
  }
  const { error } = await admin.from("commitment_submissions").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  return error ? NextResponse.json({ error: "Failed to update submission" }, { status: 500 }) : NextResponse.json({ success: true })
}
