import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminAuth } from "@/lib/cached-auth-check"
import { resolveCanonicalNameFromNchsaa } from "@/lib/nhsca-resolve-name-from-nchsaa"

/**
 * For NHSCA placements in a year, set athlete_name to the NCHSAA state spelling when
 * year + weight + last name (+ school if present) uniquely identify one wrestler.
 * Improves Auto-Match without manual SQL.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const year = typeof body.year === "number" ? body.year : parseInt(String(body.year ?? ""), 10)
    if (!year || Number.isNaN(year)) {
      return NextResponse.json({ error: "year is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: placements, error: fetchErr } = await supabase
      .from("nhsca_placements")
      .select("id, athlete_name, weight_class, high_school, year, state")
      .eq("year", year)
      .eq("state", "NC")

    if (fetchErr) {
      console.error("[resolve-names-from-nchsaa]", fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    let updated = 0
    const skipped: string[] = []

    for (const p of placements ?? []) {
      const bracketName = (p.athlete_name ?? "").toString().trim()
      if (!bracketName) continue

      const resolved = await resolveCanonicalNameFromNchsaa(supabase, {
        tournamentYear: year,
        weightClass: String(p.weight_class ?? ""),
        highSchool: p.high_school,
        bracketAthleteName: bracketName,
      })

      if (!resolved || resolved === bracketName) {
        continue
      }

      const { error: upErr } = await supabase
        .from("nhsca_placements")
        .update({ athlete_name: resolved })
        .eq("id", p.id)

      if (upErr) {
        skipped.push(`${bracketName}: ${upErr.message}`)
        continue
      }
      updated++
    }

    return NextResponse.json({
      success: true,
      year,
      updated,
      skipped: skipped.length ? skipped.slice(0, 20) : undefined,
      message:
        updated > 0
          ? `Updated ${updated} NHSCA row(s) to match NCHSAA spellings. Run Auto-Match again.`
          : "No rows updated (no unique NCHSAA match, or names already match).",
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error"
    console.error("[resolve-names-from-nchsaa]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
