import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildLiveDrawFromField, getPublicBracketDraw, loadAllConfirmedParticipantsForWeight } from "@/lib/toc/bracket-service"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { applyPersonalSeedOrderToParticipants, readTocPersonalSeedOrders } from "@/lib/toc/personal-seeding"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

/** Admin-only bracket draw until TOC leadership explicitly publishes draws. */
export async function GET(_request: Request, { params }: Params) {
  const gate = await requireTocFieldViewer()
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status },
    )
  }

  try {
    const weightClass = parseAthleteWeightClass((await params).weight)
    if (weightClass == null) {
      return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = gate.isAdmin ? await getPublicBracketDraw(admin, weightClass) : null
    const personalResult = !gate.isAdmin
      ? await loadAllConfirmedParticipantsForWeight(admin, weightClass).then(({ participants }) => {
          const orders = readTocPersonalSeedOrders(gate.appMetadata)
          const personalized = applyPersonalSeedOrderToParticipants(participants, orders[String(weightClass)])
          const draw = buildLiveDrawFromField(weightClass, personalized)
          return draw ? { draw, source: "personal" as const } : null
        })
      : null
    const visibleResult = result ?? personalResult
    if (!visibleResult) {
      return NextResponse.json(
        { error: "No bracket yet — confirm a wrestler and assign a seed (1–8) in admin." },
        { status: 404 },
      )
    }

    return NextResponse.json({
      draw: visibleResult.draw,
      source: visibleResult.source,
      canManageOfficial: gate.isAdmin,
      workspace: gate.isAdmin ? "official" : "personal",
    })
  } catch (e) {
    console.error("[toc/brackets/[weight]]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
