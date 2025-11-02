import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    console.log("🔍 Checking Darkhorse logo mapping...")

    // Check for Darkhorse logo mapping
    const { data: logoMapping, error: logoError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "club")
      .ilike("entity_name", "%darkhorse%")
      .maybeSingle()

    if (logoError) {
      console.error("❌ Error checking logo mapping:", logoError)
      return NextResponse.json({
        success: false,
        error: logoError.message,
      })
    }

    // Also check for athletes who have Darkhorse as their wrestling club
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, wrestling_club")
      .ilike("wrestling_club", "%darkhorse%")

    if (athletesError) {
      console.error("❌ Error checking athletes:", athletesError)
    }

    console.log("✅ Darkhorse check complete")
    console.log("Logo mapping:", logoMapping)
    console.log("Athletes using Darkhorse:", athletes)

    return NextResponse.json({
      success: true,
      logoMapping: logoMapping,
      athletesUsingDarkhorse: athletes || [],
      hasLogoMapping: !!logoMapping,
      logoUrl: logoMapping?.logo_url || null,
      athleteCount: athletes?.length || 0,
    })
  } catch (error) {
    console.error("❌ Error in check-darkhorse-url:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
