import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAdminAuth } from "@/lib/cached-auth-check"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Simple test endpoint to check what Supabase actually returns for 2025 Seniors
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Direct query matching what analytics does
    const { data: all2025, error: err1 } = await supabase
      .from("nhsca_placements")
      .select("*")
      .eq("state", "NC")
      .eq("year", 2025)
      .limit(10000)

    // Count query
    const { count: count2025 } = await supabase
      .from("nhsca_placements")
      .select("*", { count: "exact", head: true })
      .eq("state", "NC")
      .eq("year", 2025)

    // Senior division variations
    const seniorVariations = all2025?.filter(p => {
      const div = p.division?.toLowerCase().trim()
      return div === "senior" || div?.includes("senior")
    }) || []

    // Check division values
    const divisionValues = new Set(all2025?.map(p => p.division).filter(Boolean))
    const divisionValuesLower = new Set(all2025?.map(p => p.division?.toLowerCase().trim()).filter(Boolean))

    return NextResponse.json({
      total2025: all2025?.length || 0,
      count2025,
      seniorVariations: seniorVariations.length,
      seniorAllAmericans: seniorVariations.filter(p => p.placement !== null && p.placement !== undefined).length,
      divisionValues: Array.from(divisionValues),
      divisionValuesLower: Array.from(divisionValuesLower),
      sampleSenior: seniorVariations.slice(0, 5).map(p => ({
        name: p.athlete_name,
        division: p.division,
        placement: p.placement,
        state: p.state,
        year: p.year
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

