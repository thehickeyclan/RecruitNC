import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data: clubs, error } = await supabase
      .from("logo_mappings")
      .select("entity_name, logo_url, aliases")
      .eq("entity_type", "wrestling_club")
      .order("entity_name")

    if (error) {
      console.error("Error fetching clubs from logo_mappings:", error)
      return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 })
    }

    const formattedClubs =
      clubs?.map((club) => ({
        name: club.entity_name,
        logo_url: club.logo_url,
        aliases: club.aliases ? club.aliases.split(",").map((a) => a.trim()) : [],
      })) || []

    return NextResponse.json({ clubs: formattedClubs })
  } catch (error) {
    console.error("Error in clubs-from-logos API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
