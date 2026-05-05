import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"
import { setSupporterThankYouAck } from "@/lib/fundraising/supporter-thank-you-ack"

const ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const dynamic = "force-dynamic"

/** Toggle persisted thank-you checklist rows for managers only (parent link, athlete self, admin). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: athleteId } = await params
    if (!ATHLETE_UUID_RE.test(athleteId)) {
      return NextResponse.json({ error: "Invalid athlete id" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: { ledgerKey?: unknown; thanked?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const ledgerKey = typeof body.ledgerKey === "string" ? body.ledgerKey.trim() : ""
    if (typeof body.thanked !== "boolean") {
      return NextResponse.json({ error: "thanked must be boolean" }, { status: 400 })
    }
    const thanked = body.thanked

    if (!ledgerKey || ledgerKey.length > 512) {
      return NextResponse.json({ error: "ledgerKey required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: athlete, error: aErr } = await admin.from("athletes").select("id").eq("id", athleteId).maybeSingle()
    if (aErr || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const allowed = await userCanManageFundraisingForAthlete(admin, user.id, athleteId)
    if (!allowed) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    await setSupporterThankYouAck({
      admin,
      athleteId,
      ledgerKey,
      thanked,
      userId: user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error"
    console.error("[fundraising-thank-you-acks]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
