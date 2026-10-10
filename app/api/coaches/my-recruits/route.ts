import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadMyRecruits } from "@/lib/my-recruits"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to see your recruits." }, { status: 401 })
  try {
    const admin = createAdminClient()
    const board = await loadMyRecruits(admin, user.id)
    /*
     * Each wrestler flagged against the program's perfect recruit, when it has set one. Never
     * allowed to fail the board: the flags are an extra, the list is the page.
     */
    let fit: Record<string, { verdict: string; summary: string }> = {}
    let hasStandard = false
    try {
      const viewer = await resolveFitViewer(admin, user.id)
      hasStandard = viewer.hasStandard
      if (viewer.allowed && viewer.hasStandard) {
        const flags = await loadFitFlags(admin, board.recruits.map((r) => r.athleteId), viewer.saved!.criteria, { personal: viewer.personal })
        fit = Object.fromEntries([...flags].map(([id, f]) => [id, { verdict: f.verdict, summary: f.summary }]))
      }
    } catch (error) {
      console.error("[my-recruits] fit flags failed:", error)
    }
    return NextResponse.json({ ...board, fit, hasStandard })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load recruits." }, { status: 500 })
  }
}

