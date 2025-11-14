import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("logo_mappings").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching logo mapping:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Logo mapping not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, mapping: data })
  } catch (error) {
    console.error("Exception in logo mapping GET:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("[v0] ===== PATCH HANDLER CALLED =====")
  console.log("[v0] PATCH params:", params)
  console.log("[v0] PATCH request URL:", request.url)

  try {
    console.log("[v0] PATCH - Reading request body...")
    const body = await request.json()
    console.log("[v0] PATCH logo mapping - ID:", params.id)
    console.log("[v0] PATCH logo mapping - Body:", JSON.stringify(body, null, 2))

    const { entity_name, entity_type, logo_url, aliases, division } = body

    if (!entity_name || !entity_type || !logo_url) {
      console.log("[v0] PATCH validation failed - missing required fields")
      return NextResponse.json(
        { success: false, error: "Entity name, type, and logo URL are required" },
        { status: 400 },
      )
    }

    console.log("[v0] PATCH - Creating Supabase client...")
    const supabase = await createClient()

    console.log("[v0] Updating logo mapping with:", {
      entity_name,
      entity_type,
      logo_url,
      aliases: aliases || null,
      division: division || null,
    })

    console.log("[v0] PATCH - Executing database update...")
    const { data, error } = await supabase
      .from("logo_mappings")
      .update({
        entity_name,
        entity_type,
        logo_url,
        aliases: aliases || null,
        division: division || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating logo mapping:", error)
      console.error("[v0] Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log("[v0] Logo mapping updated successfully:", data)
    return NextResponse.json({ success: true, mapping: data })
  } catch (error) {
    console.error("[v0] ===== EXCEPTION IN PATCH HANDLER =====")
    console.error("[v0] Exception in logo mapping PATCH:", error)
    console.error("[v0] Exception stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Exception message:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("logo_mappings").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting logo mapping:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Logo mapping deleted successfully" })
  } catch (error) {
    console.error("Exception in logo mapping DELETE:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
