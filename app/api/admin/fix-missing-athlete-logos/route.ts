import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Define the missing logo mappings we need to add
    const logoMappings = [
      // Appalachian State for Colt Campbell
      {
        entity_name: "Appalachian State",
        entity_type: "college",
        logo_url: "/appalachian-state-mountains.png",
      },
      {
        entity_name: "Appalachian State University",
        entity_type: "college",
        logo_url: "/appalachian-state-mountains.png",
      },
      {
        entity_name: "App State",
        entity_type: "college",
        logo_url: "/appalachian-state-mountains.png",
      },

      // Cardinal Gibbons for Liam Hickey
      {
        entity_name: "Cardinal Gibbons",
        entity_type: "highschool",
        logo_url: "/cardinal-gibbons-crest.png",
      },
      {
        entity_name: "Cardinal Gibbons High School",
        entity_type: "highschool",
        logo_url: "/cardinal-gibbons-crest.png",
      },

      // Hickory Ridge for Colt Campbell
      {
        entity_name: "Hickory Ridge",
        entity_type: "highschool",
        logo_url: "/generic-high-school-logo.png", // We can update this later with actual logo
      },
      {
        entity_name: "Hickory Ridge High School",
        entity_type: "highschool",
        logo_url: "/generic-high-school-logo.png",
      },

      // UNC Chapel Hill variations
      {
        entity_name: "UNC Chapel Hill",
        entity_type: "college",
        logo_url: "/UNC_Chapel_Hill_Logo.png",
      },
      {
        entity_name: "University of North Carolina",
        entity_type: "college",
        logo_url: "/UNC_Chapel_Hill_Logo.png",
      },
      {
        entity_name: "University of North Carolina at Chapel Hill",
        entity_type: "college",
        logo_url: "/UNC_Chapel_Hill_Logo.png",
      },

      // NC State variations
      {
        entity_name: "NC State",
        entity_type: "college",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
      },
      {
        entity_name: "North Carolina State",
        entity_type: "college",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
      },
      {
        entity_name: "North Carolina State University",
        entity_type: "college",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
      },
    ]

    const results = []

    for (const mapping of logoMappings) {
      // Check if mapping already exists
      const { data: existing } = await supabase
        .from("logo_mappings")
        .select("id")
        .eq("entity_type", mapping.entity_type)
        .ilike("entity_name", mapping.entity_name)
        .maybeSingle()

      if (existing) {
        // Update existing
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
          success: !error,
          error: error?.message,
        })
      } else {
        // Insert new
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
          success: !error,
          error: error?.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Logo mappings processed",
      results,
    })
  } catch (error) {
    console.error("Error fixing missing athlete logos:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
