import { NextResponse } from "next/server"
import { getBlueAlumni } from "@/lib/blue-alumni"

/**
 * Public API: Blue Alumni list with divisions from college_division_mappings.
 * Used by the Blue page so the table always loads fresh (no cached HTML).
 */
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const alumni = await getBlueAlumni()
    const res = NextResponse.json({
      ok: true,
      count: alumni.length,
      alumni: alumni.map((a) => ({
        id: a.id,
        name: a.name,
        graduationyear: a.graduationyear,
        highschool: a.highschool,
        college: a.college,
        division: a.division,
      })),
    })
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
