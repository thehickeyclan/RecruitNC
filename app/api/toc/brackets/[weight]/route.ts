import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

/** Public — single weight official draw (only when locked/published). */
export async function GET(_request: Request, { params }: Params) {
  try {
    const weightClass = parseAthleteWeightClass((await params).weight)
    if (weightClass == null) {
      return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
    }

    const admin = createAdminClient()
    const draw = await getLockedDraw(admin, weightClass)
    if (!draw) {
      return NextResponse.json({ error: "Bracket not published yet." }, { status: 404 })
    }

    return NextResponse.json({ draw })
  } catch (e) {
    console.error("[toc/brackets/[weight]]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
