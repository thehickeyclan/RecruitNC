import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all athletes with JuCo or similar divisions
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, division, college")
      .or("division.ilike.%juco%,division.ilike.%junior%,division.ilike.%jc%,division.ilike.%community%")

    if (fetchError) {
      console.error("Error fetching athletes:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    console.log(`Found ${athletes.length} athletes with JuCo-like divisions`)

    // Update each athlete's division to NJCAA
    const updates = []
    for (const athlete of athletes) {
      const { error: updateError } = await supabase.from("athletes").update({ division: "NJCAA" }).eq("id", athlete.id)

      if (updateError) {
        console.error(`Error updating athlete ${athlete.id}:`, updateError)
      } else {
        updates.push({
          id: athlete.id,
          college: athlete.college,
          oldDivision: athlete.division,
          newDivision: "NJCAA",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} athletes from JuCo to NJCAA`,
      updates,
    })
  } catch (error) {
    console.error("Error updating divisions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
