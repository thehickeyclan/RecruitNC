import { NextResponse } from "next/server"
import { getBlueAlumni } from "@/lib/blue-alumni"

/**
 * Public API: Blue Alumni list.
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
        division: a.division ?? "",
      })),
    })
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
    return res
  } catch (e) {
    const res = NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
    return res
  }
}
