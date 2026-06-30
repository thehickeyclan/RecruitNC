import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { listPublicBracketSummaries } from "@/lib/toc/bracket-service"

export const dynamic = "force-dynamic"

/** Public — brackets with live field data or locked official draws. */
export async function GET() {
  try {
    const admin = createAdminClient()
    const brackets = await listPublicBracketSummaries(admin)
    return NextResponse.json({ brackets })
  } catch (e) {
    console.error("[toc/brackets]", e)
    return NextResponse.json({ brackets: [] })
  }
}
