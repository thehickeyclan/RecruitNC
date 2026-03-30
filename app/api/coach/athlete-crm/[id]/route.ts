import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNameVariants, getNHSCAFromTables } from "@/lib/tournament-tables"
import { mergeNhscaForPublicRankings } from "@/lib/public-profile-data"
import { getNhscaResults } from "@/lib/tournament-utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Athlete CRM API called with ID:", params.id)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] User authenticated:", !!user)

    if (!user) {
      console.log("[v0] No user found, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const athleteId = params.id
    console.log("[v0] Fetching athlete with ID:", athleteId)

    // Get athlete data with all CRM fields
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select(`
        id,
        name,
        graduationyear,
        weightclass,
        highschool,
        photourl,
        careerRecord,
        nhsca_results,
        nhsca_2026_placement,
        nhsca_2026_record,
        nhsca_2025_placement,
        nhsca_2024_placement,
        nhsca_2023_placement,
        nationally_ranked_wins,
        college_opens_experience,
        academic_gpa,
        academic_sat,
        academic_act,
        academic_interest,
        academic_summary,
        socialMedia,
        wrestling_name,
        first_name,
        last_name,
        added_by_coach_id
      `)
      .eq("id", athleteId)
      .single()

    console.log("[v0] Athlete query result:", { athlete, athleteError })

    if (athleteError) {
      console.log("[v0] Athlete not found, returning 404")
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Get CRM data from college_coach_stars
    const { data: crmData } = await supabase
      .from("college_coach_stars")
      .select(
        "pipeline_stage, last_contacted, parent_name, parent_phone, parent_email, athlete_cell, athlete_email, athlete_instagram, lead_source, lead_subsource, lead_source_detail",
      )
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .single()

    // Get actions history
    const { data: actions } = await supabase
      .from("recruiting_actions")
      .select("*")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .order("action_date", { ascending: false })

    const displayName =
      athlete.wrestling_name ||
      athlete.name ||
      `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim() ||
      "Athlete"

    const nameParts = displayName.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]

    const nameVariations = [displayName, `${lastName}, ${firstName}`]

    if (athlete.wrestling_name && athlete.wrestling_name !== displayName) {
      nameVariations.push(athlete.wrestling_name)
    }

    const allResults: any[] = []

    for (const nameVar of nameVariations) {
      const { data: results, error } = await supabase
        .from("wrestling_nchsaa_results")
        .select("*")
        .eq("wrestler_name", nameVar)
        .order("year", { ascending: false })

      if (!error && results && results.length > 0) {
        for (const result of results) {
          const isDuplicate = allResults.some(
            (r) => r.year === result.year && r.place === result.place && r.weight_class === result.weight_class,
          )
          if (!isDuplicate) {
            allResults.push(result)
          }
        }
      }
    }

    if (allResults.length === 0 && lastName) {
      const { data: results, error } = await supabase
        .from("wrestling_nchsaa_results")
        .select("*")
        .ilike("wrestler_name", `%${lastName}%`)
        .order("year", { ascending: false })

      if (!error && results && results.length > 0) {
        const filteredResults = results.filter((result) => {
          const resultName = result.wrestler_name.toLowerCase()
          return resultName.includes(firstName.toLowerCase()) && resultName.includes(lastName.toLowerCase())
        })

        for (const result of filteredResults) {
          const isDuplicate = allResults.some(
            (r) => r.year === result.year && r.place === result.place && r.weight_class === result.weight_class,
          )
          if (!isDuplicate) {
            allResults.push(result)
          }
        }
      }
    }

    allResults.sort((a, b) => b.year - a.year)

    const gradYear = Number((athlete as { graduationyear?: number }).graduationyear) || new Date().getFullYear()
    const displayNameForNhsca =
      (athlete as { wrestling_name?: string }).wrestling_name?.trim() ||
      (athlete as { name?: string }).name?.trim() ||
      ""
    const wrestlingName = (athlete as { wrestling_name?: string }).wrestling_name?.trim() || ""
    const namesToTry = [
      ...new Set([...getNameVariants(displayNameForNhsca), ...(wrestlingName ? getNameVariants(wrestlingName) : [])]),
    ]
    const admin = createAdminClient()
    const nhscaMergedRows: Awaited<ReturnType<typeof getNHSCAFromTables>> = []
    const seenNhsca = new Set<string>()
    for (const n of namesToTry) {
      if (!n) continue
      const rows = await getNHSCAFromTables(admin, n, gradYear)
      for (const r of rows) {
        const key = `${r.year}-${r.placement}-${r.weight ?? ""}-${r.division ?? ""}`
        if (!seenNhsca.has(key)) {
          seenNhsca.add(key)
          nhscaMergedRows.push(r)
        }
      }
    }
    nhscaMergedRows.sort((a, b) => (b.year as number) - (a.year as number))
    const nhscaForProfile = mergeNhscaForPublicRankings(nhscaMergedRows, getNhscaResults(athlete))

    const isCoachCreatedProspect = athlete.added_by_coach_id === user.id
    const leadSourceLocked = !isCoachCreatedProspect
    const leadSourceValue =
      crmData?.lead_source ??
      (leadSourceLocked ? "RecruitNC Rankings" : null)

    return NextResponse.json({
      ...athlete,
      graduation_year: (athlete as { graduationyear?: number }).graduationyear ?? null,
      nhsca_results: nhscaForProfile,
      pipeline_stage: crmData?.pipeline_stage || "Prospect",
      last_contacted: crmData?.last_contacted || null,
      parent_name: crmData?.parent_name || null,
      parent_phone: crmData?.parent_phone || null,
      parent_email: crmData?.parent_email || null,
      athlete_cell: crmData?.athlete_cell || null,
      athlete_email: crmData?.athlete_email || null,
      athlete_instagram: crmData?.athlete_instagram || null,
      lead_source: leadSourceValue,
      lead_subsource: crmData?.lead_subsource || null,
      lead_source_detail: crmData?.lead_source_detail || null,
      lead_source_locked: leadSourceLocked,
      nchsaa_results: allResults,
      actions: actions || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching athlete CRM data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
