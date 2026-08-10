import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBracketLockStatus } from "@/lib/toc/bracket-service"
import { setTocAthleteFieldLocked } from "@/lib/toc/field-publication-status"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if (!auth.isAdmin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 })
  }

  const weightClass = parseAthleteWeightClass((await params).weight)
  if (weightClass == null) {
    return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (typeof body?.athleteFieldLocked !== "boolean") {
    return NextResponse.json({ error: "athleteFieldLocked must be true or false" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (body.athleteFieldLocked) {
    const bracketStatus = await getBracketLockStatus(admin, weightClass)
    if (bracketStatus.confirmedCount < 1) {
      return NextResponse.json({ error: "Confirm at least one wrestler before locking the athlete field." }, { status: 400 })
    }
  }

  const result = await setTocAthleteFieldLocked({
    admin,
    weightClass,
    locked: body.athleteFieldLocked,
    userId: auth.userId,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: result.status })
}
