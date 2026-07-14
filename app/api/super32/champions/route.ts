import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"

/** Public Super32 champions list — placement === 1 from super32_results. */
export async function GET() {
  try {
    const adminClient = getSupabaseAdmin()

    const { data, error } = await adminClient
      .from("super32_results")
      .select("*")
      .eq("placement", 1)
      .order("year", { ascending: false })
      .order("weight_class", { ascending: true })

    if (error) {
      console.error("[RecruitNC] Error loading Super32 champions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formattedData = (data || []).map((champ: Record<string, unknown>) => ({
      athlete_name: champ.athlete_name,
      year: champ.year,
      weight_class: champ.weight_class,
      placement: champ.placement,
      high_school: champ.high_school || champ.school,
      school: champ.school || champ.high_school,
      gender: champ.gender,
      wins: champ.wins,
      losses: champ.losses,
      record: champ.record,
    }))

    return NextResponse.json({ champions: formattedData })
  } catch (error: unknown) {
    console.error("[RecruitNC] Error loading Super32 champions:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
