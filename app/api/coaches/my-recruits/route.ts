import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadMyRecruits } from "@/lib/my-recruits"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to see your recruits." }, { status: 401 })
  try {
    const admin = createAdminClient()
    /*
     * An admin may load one coach's board to see what that coach sees (Matt, 27 Oct 2026: "a way of
     * selecting a program and seeing what they see"). Read-only on the page; never anyone else.
     */
    const asId = new URL(request.url).searchParams.get("as")?.trim() || null
    let subjectId = user.id
    if (asId && asId !== user.id) {
      const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).maybeSingle()
      if (!(me?.is_admin === true || me?.role === "admin")) return NextResponse.json({ error: "Admins only." }, { status: 403 })
      subjectId = asId
    }
    const board = await loadMyRecruits(admin, subjectId)
    /*
     * Each wrestler flagged against the program's perfect recruit, when it has set one. Never
     * allowed to fail the board: the flags are an extra, the list is the page.
     */
    let fit: Record<string, { verdict: string; summary: string }> = {}
    let hasStandard = false
    try {
      const viewer = await resolveFitViewer(admin, subjectId)
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

