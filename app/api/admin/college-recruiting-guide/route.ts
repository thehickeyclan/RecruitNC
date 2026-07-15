import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { normalizeEntityName } from "@/lib/logo-mappings-normalize"
import { buildSchoolClassificationMap } from "@/lib/classification-data"
import { formatPhoneForDisplay } from "@/lib/phone-format"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin access required" }
  return { ok: true as const }
}


async function getCollegeLogoUrl(supabase: any, collegeName: string): Promise<string | null> {
  if (!collegeName?.trim()) return null
  const norm = normalizeEntityName(collegeName)
  const { data } = await supabase
    .from("logo_mappings")
    .select("logo_url")
    .eq("entity_type", "college")
    .ilike("entity_name", `%${norm}%`)
    .limit(1)
    .maybeSingle()
  return data?.logo_url ?? null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2026"
    const yearNum = parseInt(year, 10)
    if (isNaN(yearNum)) return NextResponse.json({ ok: false, error: "Invalid year" }, { status: 400 })

    const maxProspectRankForGuide = 30

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin

    const { data: athletes, error } = await admin
      .from("athletes")
      .select("*")
      .eq("graduationyear", yearNum)
      .not("prospect_ranking", "is", null)
      .lte("prospect_ranking", maxProspectRankForGuide)
      .order("prospect_ranking", { ascending: true })
      .order("name", { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const committed = (athletes || []).filter(
      (a: any) =>
        a.college &&
        !["", "Uncommitted", "TBD", "Undecided"].includes(String(a.college)),
    )
    const schoolNames = (athletes || []).map((a: any) => a.highschool || a.high_school).filter(Boolean)
    const schoolClassMap = await buildSchoolClassificationMap(supabase, schoolNames)
    const logoMap: Record<string, string | null> = {}
    await Promise.all(
      committed.map(async (a: any) => {
        const url = await getCollegeLogoUrl(supabase, a.college)
        if (url) logoMap[a.college] = url
      }),
    )

    const athletesWithResults = []
    for (const a of athletes || []) {
      const athleteName = (a.wrestling_name || a.name || "").trim()
      const schoolForDivision = String(a.highschool || a.high_school || "").trim()

      const { nchsaa: nchsaaResults, nhsca: mergedNhsca, super32: mergedSuper32 } =
        await loadAthleteTournamentBundle(db, a)

      const nh2023 = mergedNhsca.find((r) => r.year === 2023)
      const nh2024 = mergedNhsca.find((r) => r.year === 2024)
      const nh2025 = mergedNhsca.find((r) => r.year === 2025)
      const s322023 = mergedSuper32.find((r) => r.year === 2023)
      const s322024 = mergedSuper32.find((r) => r.year === 2024)
      const s322025 = mergedSuper32.find((r) => r.year === 2025)

      const college =
        a.college && !["", "Uncommitted", "TBD"].includes(String(a.college))
          ? a.college
          : null
      const divFromLogo = a.highSchoolLogoUrl && /^[12345678]A(\/2A)?$/i.test(String(a.highSchoolLogoUrl)) ? a.highSchoolLogoUrl : null
      const division = a.high_school_division || divFromLogo || schoolClassMap[schoolForDivision] || null

      athletesWithResults.push({
        id: a.id,
        name: athleteName,
        highschool: schoolForDivision || "—",
        division,
        weight: a.weight ?? a.weightclass ?? null,
        college,
        college_logo_url: college ? logoMap[college] ?? null : null,
        cell: college ? "—" : (formatPhoneForDisplay(a.cell_number ?? a.phone ?? a.cell) || "—"),
        academic_gpa: a.academic_gpa,
        nhsca_2023_record: nh2023?.record || a.nhsca_2023_record,
        nhsca_2023_placement: nh2023?.placement || a.nhsca_2023_placement,
        nhsca_2024_record: nh2024?.record || a.nhsca_2024_record,
        nhsca_2024_placement: nh2024?.placement || a.nhsca_2024_placement,
        nhsca_2025_record: nh2025?.record || a.nhsca_2025_record,
        nhsca_2025_placement: nh2025?.placement || a.nhsca_2025_placement,
        super_32_2023_record: s322023?.record || a.super_32_2023_record,
        super_32_2023_placement: s322023?.placement || a.super_32_2023_placement,
        super_32_2024_record: s322024?.record || a.super_32_2024_record,
        super_32_2024_placement: s322024?.placement || a.super_32_2024_placement,
        super_32_2025_record: s322025?.record || a.super_32_2025_record,
        super_32_2025_placement: s322025?.placement || a.super_32_2025_placement,
        nchsaa_results: nchsaaResults
          .filter((r) => r.place != null && r.place >= 1)
          .sort((a, b) => b.year - a.year)
          .map((r) => ({
            year: r.year,
            place: r.place as number,
            classification: r.classification,
            weight_class: r.weight_class,
            school: r.school,
          })),
        nhsca_results: mergedNhsca.map((r) => ({
          year: r.year,
          placement: r.placement,
          record: r.record,
        })),
        super32_results: mergedSuper32.map((r) => ({
          year: r.year,
          placement: r.placement,
          record: r.record,
        })),
      })
    }

    const res = NextResponse.json({
      ok: true,
      year: yearNum,
      athletes: athletesWithResults,
    })
    res.headers.set("Cache-Control", "no-store, max-age=0")
    return res
  } catch (err) {
    console.error("[college-recruiting-guide]", err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
