import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data: schools, error } = await supabase
      .from("logo_mappings")
      .select("entity_name, logo_url, aliases, division")
      .eq("entity_type", "high_school")
      .order("entity_name")

    if (error) {
      console.error("Error fetching high schools from logo_mappings:", error)
      return NextResponse.json({ error: "Failed to fetch high schools" }, { status: 500 })
    }

    const formattedSchools =
      schools?.map((school) => ({
        name: school.entity_name,
        logo_url: school.logo_url,
        division: school.division,
        aliases: school.aliases ? school.aliases.split(",").map((a) => a.trim()) : [],
      })) || []

    return NextResponse.json({ schools: formattedSchools })
  } catch (error) {
    console.error("Error in high-schools-from-logos API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
