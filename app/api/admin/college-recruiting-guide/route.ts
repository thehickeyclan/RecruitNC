import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"
import { normalizeEntityName } from "@/lib/logo-mappings-normalize"
import { buildSchoolClassificationMap } from "@/lib/classification-data"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin access required" }
  return { ok: true as const }
}

function formatPhone(val: string | null | undefined): string {
  if (!val) return "—"
  const digits = val.replace(/\D/g, "").slice(-10)
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  return val
}

async function getNCHSAAResults(supabase: any, athleteName: string, graduationYear: number) {
  if (!graduationYear || isNaN(graduationYear)) return []
  const { data: results } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4)
    .lte("year", graduationYear)
    .order("year", { ascending: false })
  return results || []
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

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin // use admin for tournament tables too (bypasses RLS, ensures we see all Super32/NHSCA data)

    const { data: athletes, error } = await admin
      .from("athletes")
      .select("*")
      .eq("graduationyear", yearNum)
      .not("prospect_ranking", "is", null)
      .lte("prospect_ranking", 30)
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
      const gradYear = Number(a.graduationyear) || yearNum
      const hs = a.highschool || a.high_school || ""

      let [nchsaaResults, nhscaFromTables, super32FromTable] = await Promise.all([
        getNCHSAAResults(db, athleteName, gradYear),
        getNHSCAFromTables(db, athleteName, gradYear),
        getSuper32FromTable(db, athleteName, gradYear),
      ])
      // If still no NHSCA/Super32, try "LastName FirstName" (some tables store names that way)
      if (nhscaFromTables.length === 0 || super32FromTable.length === 0) {
        const parts = athleteName.trim().split(/\s+/)
        if (parts.length >= 2) {
          const altName = [parts[parts.length - 1], ...parts.slice(0, -1)].join(" ")
          if (nhscaFromTables.length === 0) {
            nhscaFromTables = await getNHSCAFromTables(db, altName, gradYear)
          }
          if (super32FromTable.length === 0) {
            super32FromTable = await getSuper32FromTable(db, altName, gradYear)
          }
        }
      }

      // Merge NHSCA: table data first, fill missing years from athlete row
      const nhscaByYear = new Map<number, { placement: string; record: string }>()
      for (const r of nhscaFromTables) {
        const y = typeof r.year === "number" ? r.year : parseInt(String(r.year), 10)
        if (!nhscaByYear.has(y)) nhscaByYear.set(y, { placement: r.placement || "", record: r.record || "" })
      }
      for (const y of [2023, 2024, 2025]) {
        if (!nhscaByYear.has(y)) {
          const rec = a[`nhsca_${y}_record`]
          const place = a[`nhsca_${y}_placement`]
          if (rec || place != null) {
            const placeStr = place != null ? (typeof place === "number" ? String(place) : String(place)) : ""
            nhscaByYear.set(y, { placement: placeStr, record: (rec || "").toString().trim() })
          }
        }
      }
      const mergedNhsca = Array.from(nhscaByYear.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([year, v]) => ({ year, placement: v.placement, record: v.record }))

      // Merge Super 32: table data first, fill missing years from athlete row
      const super32ByYear = new Map<number, { placement: string; record: string }>()
      for (const r of super32FromTable) {
        const y = typeof r.year === "number" ? r.year : parseInt(String(r.year), 10)
        if (!super32ByYear.has(y)) super32ByYear.set(y, { placement: r.placement || "", record: r.record || "" })
      }
      for (const y of [2023, 2024, 2025]) {
        if (!super32ByYear.has(y)) {
          const rec = a[`super_32_${y}_record`]
          const place = a[`super_32_${y}_placement`]
          if (rec || place != null) {
            const placeStr = place != null ? (typeof place === "number" ? String(place) : String(place)) : ""
            super32ByYear.set(y, { placement: placeStr, record: (rec || "").toString().trim() })
          }
        }
      }
      const mergedSuper32 = Array.from(super32ByYear.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([year, v]) => ({ year, placement: v.placement, record: v.record }))

      // Derive athlete-row style fields from merged (for page display)
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
      const division = a.high_school_division || divFromLogo || schoolClassMap[hs] || null

      athletesWithResults.push({
        id: a.id,
        name: athleteName,
        highschool: hs || "—",
        division,
        weight: a.weight ?? a.weightclass ?? null,
        college,
        college_logo_url: college ? logoMap[college] ?? null : null,
        cell: college ? "—" : formatPhone(a.cell_number ?? a.phone ?? a.cell),
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
        nchsaa_results: nchsaaResults.map((r: any) => ({
          year: r.year,
          place: r.place,
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
