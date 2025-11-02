import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all athletes with Appalachian State variations
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, college")
      .or("college.ilike.%Appalachian%,college.ilike.%App State%,college.ilike.%App%State%")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates = []
    const normalizedName = "Appalachian State"

    // Process each athlete and normalize the college name
    for (const athlete of athletes) {
      if (athlete.college !== normalizedName) {
        const { data, error: updateError } = await supabase
          .from("athletes")
          .update({ college: normalizedName })
          .eq("id", athlete.id)
          .select()

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          updates.push({
            id: athlete.id,
            oldName: athlete.college,
            newName: normalizedName,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} Appalachian State entries`,
      updates,
    })
  } catch (error) {
    console.error("Error fixing college duplicates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
