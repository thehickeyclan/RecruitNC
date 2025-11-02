import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    const results = []

    // Define the specific logo mappings we want to ensure exist
    const logoMappings = [
      // Hickory Ridge variations
      {
        entity_name: "Hickory Ridge",
        entity_type: "highschool",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool-logos/hickory-ridge.png",
      },
      {
        entity_name: "Hickory Ridge High School",
        entity_type: "highschool",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool-logos/hickory-ridge.png",
      },
      // Appalachian State variations
      {
        entity_name: "Appalachian State",
        entity_type: "college",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png",
      },
      {
        entity_name: "Appalachian State University",
        entity_type: "college",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png",
      },
      // Cardinal Gibbons (ensure it exists)
      {
        entity_name: "Cardinal Gibbons",
        entity_type: "highschool",
        logo_url: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool-logos/cardinal-gibbons.png",
      },
    ]

    for (const mapping of logoMappings) {
      try {
        // Check if mapping already exists
        const { data: existingMapping, error: findError } = await supabase
          .from("logo_mappings")
          .select("id, logo_url")
          .eq("entity_type", mapping.entity_type)
          .ilike("entity_name", mapping.entity_name)
          .maybeSingle()

        if (findError) {
          console.error(`Error checking for existing mapping ${mapping.entity_name}:`, findError)
          results.push({
            entity: mapping.entity_name,
            action: "error_checking",
            error: findError.message,
          })
          continue
        }

        if (existingMapping) {
          // Update existing mapping if URL is different
          if (existingMapping.logo_url !== mapping.logo_url) {
            const { error: updateError } = await supabase
              .from("logo_mappings")
              .update({ logo_url: mapping.logo_url, updated_at: new Date().toISOString() })
              .eq("id", existingMapping.id)

            if (updateError) {
              console.error(`Error updating mapping ${mapping.entity_name}:`, updateError)
              results.push({
                entity: mapping.entity_name,
                action: "error_updating",
                error: updateError.message,
              })
            } else {
              results.push({
                entity: mapping.entity_name,
                action: "updated",
                logo_url: mapping.logo_url,
              })
            }
          } else {
            results.push({
              entity: mapping.entity_name,
              action: "already_correct",
              logo_url: mapping.logo_url,
            })
          }
        } else {
          // Insert new mapping
          const { error: insertError } = await supabase.from("logo_mappings").insert([
            {
              entity_name: mapping.entity_name,
              entity_type: mapping.entity_type,
              logo_url: mapping.logo_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])

          if (insertError) {
            console.error(`Error inserting mapping ${mapping.entity_name}:`, insertError)
            results.push({
              entity: mapping.entity_name,
              action: "error_inserting",
              error: insertError.message,
            })
          } else {
            results.push({
              entity: mapping.entity_name,
              action: "inserted",
              logo_url: mapping.logo_url,
            })
          }
        }
      } catch (error) {
        console.error(`Exception processing ${mapping.entity_name}:`, error)
        results.push({
          entity: mapping.entity_name,
          action: "exception",
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const successCount = results.filter(
      (r) => r.action === "updated" || r.action === "inserted" || r.action === "already_correct",
    ).length
    const errorCount = results.filter((r) => r.action.includes("error") || r.action === "exception").length

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} logo mappings. ${successCount} successful, ${errorCount} errors.`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        errors: errorCount,
      },
    })
  } catch (error) {
    console.error("Error in fix-specific-logos:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
