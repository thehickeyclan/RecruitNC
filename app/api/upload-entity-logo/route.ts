import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"
import { normalizeEntityName, normalizeEntityType } from "@/lib/logo-mappings-normalize"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const entityName = formData.get("entityName") as string
    const entityType = formData.get("entityType") as string
    const file = formData.get("file") as File
    const logoUrl = formData.get("logoUrl") as string

    console.log("upload-entity-logo received:", { entityName, entityType, hasFile: !!file, logoUrl })

    if (!entityName || !entityType) {
      return NextResponse.json({ error: "Entity name and type are required" }, { status: 400 })
    }

    let finalLogoUrl = ""

    if (file) {
      console.log("Uploading file to blob storage...")
      // Upload file to Vercel Blob
      const blob = await put(`logos/${entityType}/${entityName}-${Date.now()}.${file.name.split(".").pop()}`, file, {
        access: "public",
      })
      finalLogoUrl = blob.url
      console.log("File uploaded to:", finalLogoUrl)
    } else if (logoUrl) {
      // Use provided URL
      finalLogoUrl = logoUrl
      console.log("Using provided URL:", finalLogoUrl)
    } else {
      return NextResponse.json({ error: "Either file or logoUrl is required" }, { status: 400 })
    }

    // Save to database (canonical name/type so lookups always match)
    console.log("Saving to database...")
    const supabase = createClient()
    const canonicalName = normalizeEntityName(entityName)
    const canonicalType = normalizeEntityType(entityType)

    const { data, error } = await supabase
      .from("logo_mappings")
      .upsert({
        entity_name: canonicalName,
        entity_type: canonicalType,
        logo_url: finalLogoUrl,
        updated_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error saving logo mapping:", error)
      return NextResponse.json({ error: "Failed to save logo mapping" }, { status: 500 })
    }

    console.log("Logo mapping saved successfully:", data)

    return NextResponse.json({
      success: true,
      logoUrl: finalLogoUrl,
      message: `Logo for ${entityName} saved successfully`,
    })
  } catch (error) {
    console.error("Error in upload-entity-logo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
