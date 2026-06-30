import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicBracketDraw } from "@/lib/toc/bracket-service"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

/** Public — bracket for one weight (live field or locked draw). */
export async function GET(_request: Request, { params }: Params) {
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
