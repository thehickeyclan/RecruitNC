import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all athletes
    const { data: athletes, error: fetchError } = await supabase.from("athletes").select("*")

    if (fetchError) {
      throw fetchError
    }

    const updates: any[] = []

    // Update each athlete with a default image if they don't have one
    for (const athlete of athletes || []) {
      if (!athlete.photourl || athlete.photourl === "") {
        const { data, error: updateError } = await supabase
          .from("athletes")
          .update({ photourl: "/wrestler-profile.png" })
          .eq("id", athlete.id)
          .select()

        if (!updateError && data) {
          updates.push({ id: athlete.id, name: athlete.name })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "All athlete images updated",
      updatedCount: updates.length,
      updates,
    })
  } catch (error) {
    console.error("Error updating athlete images:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update athlete images",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
