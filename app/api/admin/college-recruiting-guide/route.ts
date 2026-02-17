import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNHSCAFromTables } from "@/lib/tournament-tables"
import { normalizeEntityName } from "@/lib/logo-mappings-normalize"

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

      const [nchsaaResults, nhscaFromTables] = await Promise.all([
        getNCHSAAResults(supabase, athleteName, gradYear),
        getNHSCAFromTables(supabase, athleteName, gradYear),
      ])

      const college =
        a.college && !["", "Uncommitted", "TBD"].includes(String(a.college))
          ? a.college
          : null

      athletesWithResults.push({
        id: a.id,
        name: athleteName,
        highschool: a.highschool || a.high_school || "—",
        division: a.high_school_division || null,
        weight: a.weight ?? a.weightclass ?? null,
        college,
        college_logo_url: college ? logoMap[college] ?? null : null,
        cell: college ? "—" : formatPhone(a.cell_number ?? a.phone ?? a.cell),
        academic_gpa: a.academic_gpa,
        nhsca_2023_record: a.nhsca_2023_record,
        nhsca_2023_placement: a.nhsca_2023_placement,
        nhsca_2024_record: a.nhsca_2024_record,
        nhsca_2024_placement: a.nhsca_2024_placement,
        nhsca_2025_record: a.nhsca_2025_record,
        nhsca_2025_placement: a.nhsca_2025_placement,
        super_32_2024_record: a.super_32_2024_record,
        super_32_2024_placement: a.super_32_2024_placement,
        super_32_2025_record: a.super_32_2025_record,
        super_32_2025_placement: a.super_32_2025_placement,
        nchsaa_results: nchsaaResults.map((r: any) => ({
          year: r.year,
          place: r.place,
          classification: r.classification,
          weight_class: r.weight_class,
          school: r.school,
        })),
        nhsca_results: nhscaFromTables.map((r) => ({
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
