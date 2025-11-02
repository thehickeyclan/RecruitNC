import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { data: wrestlingData, error } = await supabase
      .from("wrestling_nchsaa_results")
      .select("wrestler_name, school, year, weight_class, place, classification")
      .in("year", [2024, 2025])
      .order("year", { ascending: false })
      .order("wrestler_name")

    if (error) {
      console.error("[v0] Wrestling debug query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: wrestlingData?.length || 0,
      data: wrestlingData || [],
    })
  } catch (error) {
    console.error("[v0] Wrestling debug API error:", error)
    return NextResponse.json({ error: "Failed to fetch wrestling data" }, { status: 500 })
  }
}
