import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

/**
 * One-time diagnostic: what does production actually get from the DB and from getDivisionFromMappings?
 * Hit: GET /api/debug/division
 * - If rawTable is empty → wrong Supabase project or env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
 * - If rawTable has rows but mountOlive/ncState are wrong → bug is in getDivisionFromMappings.
 * - If rawTable and mountOlive/ncState are correct → bug is elsewhere (caching, different API, or UI path).
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: rows, error } = await supabase
      .from("college_divisions")
      .select("college_name, division")
      .limit(50)
      .order("college_name")

    const mountOlive = await getDivisionFromMappings("Mount Olive")
    const universityMountOlive = await getDivisionFromMappings("University of Mount Olive")
    const ncState = await getDivisionFromMappings("NC State")

    return NextResponse.json({
      ok: true,
      rawTable: {
        rowCount: rows?.length ?? 0,
        error: error?.message ?? null,
        sample: (rows ?? []).slice(0, 15).map((r) => ({ college_name: r.college_name, division: r.division })),
      },
      getDivisionFromMappings: {
        "Mount Olive": mountOlive || "(empty)",
        "University of Mount Olive": universityMountOlive || "(empty)",
        "NC State": ncState || "(empty)",
      },
      env: {
        hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
