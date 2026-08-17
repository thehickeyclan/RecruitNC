import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBracketLockStatus } from "@/lib/toc/bracket-service"
import { setTocFieldAnnounced } from "@/lib/toc/field-publication-status"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

/**
 * Release (or un-release) a weight class to the public field page.
 *
 * Full admins only. The scoped TOC media role (`app_metadata.toc_field_access`) can read the private field
 * board and is the group doing the announcements, but the act of publishing athlete data stays with admins —
 * an accidental click here puts names and photos in front of the world.
 */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Admin required to release a weight publicly" }, { status: 403 })
  }

  const weightClass = parseAthleteWeightClass((await params).weight)
  if (weightClass == null) {
    return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (typeof body?.announced !== "boolean") {
    return NextResponse.json({ error: "announced must be true or false" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (body.announced) {
    // Releasing an empty weight would publish a bracket page with nobody on it.
    const bracketStatus = await getBracketLockStatus(admin, weightClass)
    if (bracketStatus.confirmedCount < 1) {
      return NextResponse.json(
        { error: "No confirmed wrestlers at this weight yet — nothing to release publicly." },
        { status: 400 },
      )
    }
  }

  const result = await setTocFieldAnnounced({
    admin,
    weightClass,
    announced: body.announced,
    userId: auth.userId,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  console.info(
    `[toc-announce] weight ${weightClass} ${body.announced ? "RELEASED publicly" : "un-released"} by ${auth.userId}`,
  )

  return NextResponse.json({ ok: true, status: result.status })
}
