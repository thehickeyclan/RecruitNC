import { NextResponse } from "next/server"
import { getBlueAlumni } from "@/lib/blue-alumni"

/**
 * Returns the exact Blue Alumni list the /blue page uses, with divisions.
 * Hit: GET /api/debug/blue-alumni-divisions
 * If division is correct here but wrong on /blue, the page is cached or built differently.
 */
export async function GET() {
  try {
    const alumni = await getBlueAlumni()
    return NextResponse.json({
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
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
