import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPoundForPoundBoard } from "@/lib/rankings/pound-for-pound-load"

export const dynamic = "force-dynamic"

/** Three classes of results and every cross-class bout between them; the class board needs 60. */
export const maxDuration = 60

const cachedBoard = unstable_cache(
  async (gender: string) => buildPoundForPoundBoard({ supabase: createAdminClient(), gender }),
  // Bump when `PoundForPoundEntry` changes shape: a cached payload outlives a deploy, and the
  // class board has already been taken down once by older data reaching newer code.
  ["admin-p4p-board", "v1"],
  { revalidate: 600, tags: ["admin-p4p-board"] },
)

export async function GET(request: Request) {
  try {
    /*
     * Gated, and gated here rather than only in the page.
     *
     * This is an unpublished ranking of minors across three classes. The class board's own route
     * is admin-only for the same reason, and a ranking that is only hidden by the UI is not
     * hidden — the payload is one fetch away for anybody who guesses the path.
     */
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()
    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender") || "Male"
    const fresh = searchParams.get("refresh") === "1"
    const board = fresh
      ? await buildPoundForPoundBoard({ supabase: createAdminClient(), gender })
      : await cachedBoard(gender)
    return NextResponse.json({ ...board, meta: { ...board.meta, gender } })
  } catch (error) {
    console.error("[rankings-p4p] GET failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build pound-for-pound board" },
      { status: 500 },
    )
  }
}
