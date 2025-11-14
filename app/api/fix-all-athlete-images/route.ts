import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // First, get all athletes
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, name, photourl, commitmentphotourl")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates = []

    // Process each athlete
    for (const athlete of athletes || []) {
      // If one field has an image but the other doesn't, copy it
      if (athlete.photourl && !athlete.commitmentphotourl) {
        updates.push({
          id: athlete.id,
          commitmentphotourl: athlete.photourl,
        })
      } else if (!athlete.photourl && athlete.commitmentphotourl) {
        updates.push({
          id: athlete.id,
          photourl: athlete.commitmentphotourl,
        })
      }
    }

    // Perform updates if needed
    if (updates.length > 0) {
      const { error: updateError } = await supabase.from("athletes").upsert(updates)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${updates.length} athletes`,
      })
    }

    return NextResponse.json({
      success: true,
      message: "No updates needed",
    })
  } catch (error) {
    console.error("Error fixing athlete images:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
