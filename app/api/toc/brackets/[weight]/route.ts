import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicBracketDraw } from "@/lib/toc/bracket-service"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { requireTocBracketViewer } from "@/lib/toc/require-toc-bracket-viewer"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

/** Admin-only bracket draw until TOC leadership explicitly publishes draws. */
export async function GET(_request: Request, { params }: Params) {
  const gate = await requireTocBracketViewer()
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
    const result = await getPublicBracketDraw(admin, weightClass)
    if (!result) {
      return NextResponse.json(
        { error: "No bracket yet — confirm a wrestler and assign a seed (1–8) in admin." },
        { status: 404 },
      )
    }

    return NextResponse.json({ draw: result.draw, source: result.source })
  } catch (e) {
    console.error("[toc/brackets/[weight]]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
