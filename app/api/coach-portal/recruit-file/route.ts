import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fileSummary, fileViewer } from "@/lib/recruiting/recruit-file"

/**
 * The slim "In your recruits" bar on the public profile (components/coach/recruit-file-bar.tsx):
 * whether the viewer's program has this wrestler on its board, his stage, and how many notes.
 * Nothing else private reaches the profile. `{ file: null }` for everyone else.
 */
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const none = NextResponse.json({ file: null }, { headers: { "Cache-Control": "private, no-store" } })
  const athleteId = new URL(request.url).searchParams.get("athleteId")?.trim()
  if (!athleteId) return none
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return none
  const admin = createAdminClient()
  const viewer = await fileViewer(admin, user.id)
  if (!viewer.isCollegeCoach && !viewer.isAdmin) return none
  const file = await fileSummary(admin, viewer, athleteId).catch(() => null)
  return NextResponse.json({ file }, { headers: { "Cache-Control": "private, no-store" } })
}
