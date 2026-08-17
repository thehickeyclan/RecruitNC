import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Get all athletes to see what entities we need logos for
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("name, college, highschool, wrestlingClub")

    if (athletesError) {
      throw new Error(`Failed to fetch athletes: ${athletesError.message}`)
    }

    // Collect all unique entities
    const entities = new Set<string>()
    const entityTypes = new Map<string, string>()

    athletes?.forEach((athlete) => {
      if (athlete.college && athlete.college.trim()) {
        entities.add(athlete.college.trim())
        entityTypes.set(athlete.college.trim(), "college")
      }
      if (athlete.highschool && athlete.highschool.trim()) {
        entities.add(athlete.highschool.trim())
        entityTypes.set(athlete.highschool.trim(), "highschool")
      }
      if (athlete.wrestlingClub && athlete.wrestlingClub.trim() && athlete.wrestlingClub !== "none") {
        entities.add(athlete.wrestlingClub.trim())
        entityTypes.set(athlete.wrestlingClub.trim(), "club")
      }
    })

    console.log(`Found ${entities.size} unique entities across all athletes`)

    // Define our standardized logo mappings
    const standardMappings = [
      // Colleges
      { entity_name: "Appalachian State", entity_type: "college", logo_url: "/appalachian-state-mountains.png" },
      {
        entity_name: "Appalachian State University",
        entity_type: "college",
        logo_url: "/appalachian-state-mountains.png",
      },
      { entity_name: "App State", entity_type: "college", logo_url: "/appalachian-state-mountains.png" },
      { entity_name: "UNC Chapel Hill", entity_type: "college", logo_url: "/UNC_Chapel_Hill_Logo.png" },
      { entity_name: "University of North Carolina", entity_type: "college", logo_url: "/UNC_Chapel_Hill_Logo.png" },
      {
        entity_name: "University of North Carolina at Chapel Hill",
        entity_type: "college",
        logo_url: "/UNC_Chapel_Hill_Logo.png",
      },
      { entity_name: "NC State", entity_type: "college", logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png" },
      { entity_name: "North Carolina State", entity_type: "college", logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png" },
      { entity_name: "North Carolina State University", entity_type: "college", logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png" },
      { entity_name: "Campbell University", entity_type: "college", logo_url: "/campbell-university-seal.png" },
      { entity_name: "Campbell", entity_type: "college", logo_url: "/campbell-university-seal.png" },
      { entity_name: "Queens University", entity_type: "college", logo_url: "/queens-university-shield.png" },
      { entity_name: "Queens", entity_type: "college", logo_url: "/queens-university-shield.png" },
      {
        entity_name: "Belmont Abbey College",
        entity_type: "college",
        logo_url: "/belmont-abbey-architectural-detail.png",
      },
      { entity_name: "Belmont Abbey", entity_type: "college", logo_url: "/belmont-abbey-architectural-detail.png" },
      { entity_name: "UNC Pembroke", entity_type: "college", logo_url: "/unc-pembroke-seal.png" },
      {
        entity_name: "University of North Carolina at Pembroke",
        entity_type: "college",
        logo_url: "/unc-pembroke-seal.png",
      },
      { entity_name: "Greensboro College", entity_type: "college", logo_url: "/Greensboro-College-Seal.png" },

      // High Schools
      { entity_name: "Cardinal Gibbons", entity_type: "highschool", logo_url: "/cardinal-gibbons-crest.png" },
      {
        entity_name: "Cardinal Gibbons High School",
        entity_type: "highschool",
        logo_url: "/cardinal-gibbons-crest.png",
      },
      { entity_name: "Cary High School", entity_type: "highschool", logo_url: "/cary-high-school-spirit.png" },
      { entity_name: "Cary High", entity_type: "highschool", logo_url: "/cary-high-school-spirit.png" },
      { entity_name: "Hough High School", entity_type: "highschool", logo_url: "/hough-high-school-logo.png" },
      { entity_name: "Hough High", entity_type: "highschool", logo_url: "/hough-high-school-logo.png" },
      { entity_name: "Laney High School", entity_type: "highschool", logo_url: "/Laney-High-Wildcats.png" },
      { entity_name: "Laney High", entity_type: "highschool", logo_url: "/Laney-High-Wildcats.png" },
      {
        entity_name: "Jack Britt High School",
        entity_type: "highschool",
        logo_url: "/jack-britt-high-school-logo.png",
      },
      { entity_name: "Jack Britt High", entity_type: "highschool", logo_url: "/jack-britt-high-school-logo.png" },
      {
        entity_name: "Hickory Ridge High School",
        entity_type: "highschool",
        logo_url: "/generic-high-school-logo.png",
      },
      { entity_name: "Hickory Ridge", entity_type: "highschool", logo_url: "/generic-high-school-logo.png" },

      // Clubs
      { entity_name: "NC United", entity_type: "club", logo_url: "/nc-united-main-logo.png" },
      { entity_name: "North Carolina United", entity_type: "club", logo_url: "/nc-united-main-logo.png" },
      { entity_name: "Port City Pirates", entity_type: "club", logo_url: "/wrestling-club-logo.png" },
    ]

    const results = []

    // First, clean up any duplicate entity_type variations
    console.log("Cleaning up entity_type variations...")

    // Get all existing mappings with problematic entity_types
    const { data: problematicMappings } = await supabase
      .from("logo_mappings")
      .select("*")
      .in("entity_type", ["high_school", "High-School"])

    if (problematicMappings && problematicMappings.length > 0) {
      console.log(`Found ${problematicMappings.length} mappings with problematic entity_types`)

      for (const mapping of problematicMappings) {
        // Update to standard "highschool" type
        const { error: updateError } = await supabase
          .from("logo_mappings")
          .update({ entity_type: "highschool" })
          .eq("id", mapping.id)

        results.push({
          action: "standardized_entity_type",
          entity_name: mapping.entity_name,
          old_type: mapping.entity_type,
          new_type: "highschool",
          success: !updateError,
          error: updateError?.message,
        })
      }
    }

    // Now add/update our standard mappings
    for (const mapping of standardMappings) {
      console.log(`Processing: ${mapping.entity_type} - ${mapping.entity_name}`)

      // Check if mapping already exists (exact match)
      const { data: existing } = await supabase
        .from("logo_mappings")
        .select("id, logo_url")
        .eq("entity_type", mapping.entity_type)
        .ilike("entity_name", mapping.entity_name)
        .maybeSingle()

      if (existing) {
        // Update existing mapping if logo_url is different
        if (existing.logo_url !== mapping.logo_url) {
          const { error } = await supabase
            .from("logo_mappings")
            .update({
              logo_url: mapping.logo_url,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)

          results.push({
            action: "updated",
            entity_name: mapping.entity_name,
            entity_type: mapping.entity_type,
            old_logo_url: existing.logo_url,
            new_logo_url: mapping.logo_url,
            success: !error,
            error: error?.message,
          })
        } else {
          results.push({
            action: "skipped",
            entity_name: mapping.entity_name,
            entity_type: mapping.entity_type,
            reason: "already_exists_with_correct_logo",
            success: true,
          })
        }
      } else {
        // Insert new mapping
        const { error } = await supabase.from("logo_mappings").insert([
          {
            entity_name: mapping.entity_name,
            entity_type: mapping.entity_type,
            logo_url: mapping.logo_url,
          },
        ])

        results.push({
          action: "inserted",
          entity_name: mapping.entity_name,
          entity_type: mapping.entity_type,
          logo_url: mapping.logo_url,
          success: !error,
          error: error?.message,
        })
      }
    }

    // Check for entities that still don't have logos
    const missingLogos = []
    for (const entityName of entities) {
      const entityType = entityTypes.get(entityName)

      const { data: hasLogo } = await supabase
        .from("logo_mappings")
        .select("id")
        .eq("entity_type", entityType)
        .ilike("entity_name", entityName)
        .maybeSingle()

      if (!hasLogo) {
        missingLogos.push({
          entity_name: entityName,
          entity_type: entityType,
          suggested_logo:
            entityType === "college"
              ? "/generic-college-logo.png"
              : entityType === "highschool"
                ? "/generic-high-school-logo.png"
                : "/wrestling-club-logo.png",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Logo mappings standardized",
      results,
      missing_logos: missingLogos,
      total_entities_found: entities.size,
      summary: {
        inserted: results.filter((r) => r.action === "inserted").length,
        updated: results.filter((r) => r.action === "updated").length,
        skipped: results.filter((r) => r.action === "skipped").length,
        standardized_types: results.filter((r) => r.action === "standardized_entity_type").length,
        still_missing: missingLogos.length,
      },
    })
  } catch (error) {
    console.error("Error standardizing logo mappings:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
