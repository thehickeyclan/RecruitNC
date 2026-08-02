import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { listPublicBracketSummaries } from "@/lib/toc/bracket-service"
import { requireTocBracketViewer } from "@/lib/toc/require-toc-bracket-viewer"

export const dynamic = "force-dynamic"

/** Admin-only bracket summaries until TOC leadership explicitly publishes draws. */
export async function GET() {
  const gate = await requireTocBracketViewer()
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden", brackets: [] },
      { status: gate.status },
    )
  }

  try {
    const admin = createAdminClient()
    const brackets = await listPublicBracketSummaries(admin)
    return NextResponse.json({ brackets })
  } catch (e) {
    console.error("[toc/brackets]", e)
    return NextResponse.json({ brackets: [] })
  }
}
