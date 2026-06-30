import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { listLockedDrawSummaries } from "@/lib/toc/bracket-service"

export const dynamic = "force-dynamic"

/** Public — list published (locked) bracket draws. */
export async function GET() {
  try {
    const admin = createAdminClient()
    const brackets = await listLockedDrawSummaries(admin)
    return NextResponse.json({ brackets })
  } catch (e) {
    console.error("[toc/brackets]", e)
    return NextResponse.json({ brackets: [] })
  }
}
