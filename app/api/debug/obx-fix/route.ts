import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // 1. First, let's see what Everest actually has for club name
    const { data: everest, error: everestError } = await supabase
      .from("athletes")
      .select("id, name, wrestling_club, wrestlingclub, club, wrestlingClub")
      .ilike("name", "%everest%")
      .ilike("name", "%ouellette%")
      .maybeSingle()

    if (everestError) {
      return NextResponse.json({ success: false, error: everestError.message })
    }

    if (!everest) {
      return NextResponse.json({ success: false, error: "Everest Ouellette not found" })
    }

    const clubName = everest.wrestling_club || everest.wrestlingclub || everest.club || everest.wrestlingClub

    console.log("Found Everest with club name:", clubName)

    // 2. Check if logo mapping exists for this exact name
    const { data: existingMapping, error: mappingError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", "club")
      .ilike("entity_name", clubName)
      .maybeSingle()

    if (mappingError) {
      return NextResponse.json({ success: false, error: mappingError.message })
    }

    let result = {
      everest_data: everest,
      club_name: clubName,
      existing_mapping: existingMapping,
      action_taken: null as string | null
    }

    // 3. If no mapping exists, create one
    if (!existingMapping && clubName) {
      console.log("No mapping found, creating one for:", clubName)
      
      // Create a generic logo mapping for OBX Wrestling Factory
      const { data: newMapping, error: insertError } = await supabase
        .from("logo_mappings")
        .insert({
          entity_name: clubName,
          entity_type: "club",
          logo_url: "/wrestling-club-logo.png", // Generic fallback
          aliases: "OBX WF, OBX Wrestling, Outer Banks Wrestling Factory",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message })
      }

      result.action_taken = "Created new logo mapping"
      result.existing_mapping = newMapping
    } else if (existingMapping) {
      result.action_taken = "Mapping already exists"
    } else {
      result.action_taken = "No club name found for Everest"
    }

    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error("Error in OBX fix:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    })
  }
}
