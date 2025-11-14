import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // First check if the mapping already exists
    const { data: existing, error: checkError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_name", "Cardinal Gibbons High School")
      .eq("entity_type", "highschool")
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing mapping:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    const newLogoUrl =
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool-logos/cardinal-gibbons-high-school.png"

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("logo_mappings")
        .update({
          logo_url: newLogoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("entity_name", "Cardinal Gibbons High School")
        .eq("entity_type", "highschool")
        .select()

      if (error) {
        console.error("Error updating Cardinal Gibbons logo:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Cardinal Gibbons logo updated successfully! Old URL: ${existing.logo_url}`,
        data,
        action: "updated",
      })
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("logo_mappings")
        .insert({
          entity_name: "Cardinal Gibbons High School",
          entity_type: "highschool",
          logo_url: newLogoUrl,
        })
        .select()

      if (error) {
        console.error("Error inserting Cardinal Gibbons logo:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Cardinal Gibbons logo added successfully",
        data,
        action: "inserted",
      })
    }
  } catch (error) {
    console.error("Exception handling Cardinal Gibbons logo:", error)
    return NextResponse.json({ error: "Failed to process logo" }, { status: 500 })
  }
}
