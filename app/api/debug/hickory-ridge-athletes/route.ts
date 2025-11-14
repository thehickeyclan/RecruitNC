import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Check all variations of Hickory Ridge
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, firstName, lastName, college, highschool, gender, graduationyear")
      .or("highschool.ilike.%hickory ridge%,highschool.ilike.%hickory%")
      .not("college", "is", null)
      .order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      total: athletes?.length || 0,
      athletes: athletes || [],
      hickory_ridge_variations: [...new Set(athletes?.map((a) => a.highschool) || [])],
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
