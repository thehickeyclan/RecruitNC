import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaPlacerRecords: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const countValue = params.championshipCount

  if (!countValue) {
    // If no count specified, return all multiple-time All-Americans (2+)
    const { data, error } = await adminClient
      .from("wrestling_nhsca_results")
      .select("athlete_name, placement, year, division, weight, high_school, state")
      .gte("placement", 1)
      .lte("placement", 8)
      .not("high_school", "is", null)
      .neq("high_school", "")
      .not("high_school", "ilike", "unknown")
      .not("athlete_name", "is", null)
      .neq("athlete_name", "")
      .limit(100000)

    if (error) throw error

    // Normalize names and group by wrestler
    const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
    const groups: Record<string, {
      name: string
      results: any[]
      high_schools: Set<string>
      divisions: Set<string>
      weights: Set<string>
    }> = {}

    data?.forEach((r: any) => {
      const norm = normalize(r.athlete_name)
      if (!norm) return

      if (!groups[norm]) {
        groups[norm] = {
          name: r.athlete_name,
          results: [],
          high_schools: new Set(),
          divisions: new Set(),
          weights: new Set(),
        }
      }

      groups[norm].results.push({
        year: r.year,
        division: r.division,
        weight: r.weight,
        placement: r.placement,
        high_school: r.high_school,
      })
      if (r.high_school) groups[norm].high_schools.add(r.high_school)
      if (r.division) groups[norm].divisions.add(r.division)
      if (r.weight) groups[norm].weights.add(r.weight)
    })

    const filteredResults = Object.values(groups)
      .map(g => ({
        athlete_name: g.name,
        all_american_count: g.results.length,
        all_americans: g.results.sort((a, b) => b.year - a.year),
        high_schools: Array.from(g.high_schools),
        divisions: Array.from(g.divisions),
        weights: Array.from(g.weights),
      }))
      .filter(r => r.all_american_count >= 2)
      .sort((a, b) => {
        if (b.all_american_count !== a.all_american_count) {
          return b.all_american_count - a.all_american_count
        }
        return a.athlete_name.localeCompare(b.athlete_name)
      })

    return { results: filteredResults }
  }

  // Specific count (2x, 3x, 4x, etc.)
  const numCount = Number(countValue)
  const { data, error } = await adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name, placement, year, division, weight, high_school, state")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .not("athlete_name", "is", null)
    .neq("athlete_name", "")
    .limit(100000)

  if (error) throw error

  // Normalize names and group by wrestler
  const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
  const groups: Record<string, {
    name: string
    results: any[]
    high_schools: Set<string>
    divisions: Set<string>
    weights: Set<string>
  }> = {}

  data?.forEach((r: any) => {
    const norm = normalize(r.athlete_name)
    if (!norm) return

    if (!groups[norm]) {
      groups[norm] = {
        name: r.athlete_name,
        results: [],
        high_schools: new Set(),
        divisions: new Set(),
        weights: new Set(),
      }
    }

    groups[norm].results.push({
      year: r.year,
      division: r.division,
      weight: r.weight,
      placement: r.placement,
      high_school: r.high_school,
    })
    if (r.high_school) groups[norm].high_schools.add(r.high_school)
    if (r.division) groups[norm].divisions.add(r.division)
    if (r.weight) groups[norm].weights.add(r.weight)
  })

  const filteredResults = Object.values(groups)
    .map(g => ({
      athlete_name: g.name,
      all_american_count: g.results.length,
      all_americans: g.results.sort((a, b) => b.year - a.year),
      high_schools: Array.from(g.high_schools),
      divisions: Array.from(g.divisions),
      weights: Array.from(g.weights),
    }))
    .filter(r => r.all_american_count === numCount)
    .sort((a, b) => {
      if (b.all_american_count !== a.all_american_count) {
        return b.all_american_count - a.all_american_count
      }
      return a.athlete_name.localeCompare(b.athlete_name)
    })

  return { results: filteredResults }
}

