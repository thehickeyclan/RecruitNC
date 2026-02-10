import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id
    const supabase = createAdminClient()

    const { data: images, error } = await supabase
      .from("nc_united_images")
      .select("*")
      .eq("tournament_id", tournamentId)
      .is("wrestler_id", null) // Only gallery images, not wrestler-specific
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching gallery images:", error)
      return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 })
    }

    return NextResponse.json(images || [])
  } catch (error) {
    console.error("Error in gallery route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
