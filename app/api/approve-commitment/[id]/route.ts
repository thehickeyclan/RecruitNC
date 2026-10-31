import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { verifyApprovalToken } from "@/lib/commitments/approval-link"
import { approveSubmission, rejectSubmission } from "@/lib/commitments/apply"

export const dynamic = "force-dynamic"

/**
 * Approve or decline one reported commitment: the button on the page Matt's text opens.
 *
 * The link's token is the permission (lib/commitments/approval-link.ts), so it works from his phone
 * signed out; a signed-in admin needs no token. Approving writes the profile, sends the app alert and
 * tells the reporter it is live - all of it in lib/commitments/apply.ts.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    token?: string
    action?: "approve" | "reject"
    athleteId?: string | null
    collegeId?: string | null
    announce?: boolean
    createProfile?: boolean
  } | null
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 })

  const allowed = verifyApprovalToken(id, body.token) || (await requireAdmin()).ok
  if (!allowed) return NextResponse.json({ error: "This link has expired. Open the submission from the admin page." }, { status: 403 })

  const admin = createAdminClient()
  if (body.action === "reject") {
    const out = await rejectSubmission(admin, id)
    return out.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: out.error }, { status: 500 })
  }

  const outcome = await approveSubmission(admin, id, {
    athleteId: body.athleteId ?? null,
    collegeId: body.collegeId === undefined ? undefined : body.collegeId,
    announce: body.announce,
    createProfile: body.createProfile === true,
  })
  return outcome.ok ? NextResponse.json(outcome) : NextResponse.json({ error: outcome.error }, { status: outcome.status })
}
