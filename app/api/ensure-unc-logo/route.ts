import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const targetName = "UNC Chapel Hill"
    const targetType = "college"
    const targetUrl = "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png"

    // Check if mapping already exists (more thorough check)
    const { data: existing, error: findError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", targetType)
      .or(`entity_name.eq.${targetName},entity_name.ilike.%UNC%Chapel%Hill%`)

    if (findError) {
      console.error("Error checking for existing mapping:", findError)
      return NextResponse.json({ success: false, error: findError.message }, { status: 400 })
    }

    if (existing && existing.length > 0) {
      // Update existing mapping
      const { data: updated, error: updateError } = await supabase
        .from("logo_mappings")
        .update({
          entity_name: targetName,
          logo_url: targetUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating UNC logo:", updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: `Updated existing UNC Chapel Hill logo mapping (was: "${existing[0].entity_name}")`,
        data: updated,
        action: "updated",
      })
    }

    // Insert new mapping if none exists
    const { data: inserted, error: insertError } = await supabase
      .from("logo_mappings")
      .insert([
        {
          entity_name: targetName,
          entity_type: targetType,
          logo_url: targetUrl,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting UNC logo:", insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Created new UNC Chapel Hill logo mapping",
      data: inserted,
      action: "created",
    })
  } catch (error) {
    console.error("Error ensuring UNC logo:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
