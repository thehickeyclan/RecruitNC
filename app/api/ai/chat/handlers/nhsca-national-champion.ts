import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

export const handleNhscaNationalChampion: QueryHandler = async (
  params,
  request,
  messageId
) => {
  const adminClient = getSupabaseAdmin()
  const year = params.year
  const division = params.division

  let query = adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name, placement, year, division, weight, high_school, state")
    .eq("placement", 1) // National Champions only (placement = 1)

  if (year) {
    query = query.eq("year", year)
  }

  if (division) {
    // Normalize division name (capitalize first letter)
    const divisionNormalized = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase()
    query = query.eq("division", divisionNormalized)
  }

  query = query
    .order("year", { ascending: false })
    .order("weight", { ascending: true })

  const { data, error } = await query.limit(500)

  if (error) {
    console.error("[Handler] nhsca_national_champion error:", error)
    throw error
  }

  return {
    results: (data || []).map((r: any) => ({ ...r, source: "nhsca" })),
  }
}

