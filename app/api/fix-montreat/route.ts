import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Find all athletes with Montreat College
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, division, college")
      .ilike("college", "%montreat%")

    if (fetchError) {
      console.error("Error fetching Montreat athletes:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates: { id: string; oldDivision: string | null; newDivision: string }[] = []
    const errors: { id: string; error: string }[] = []

    // Update each athlete to NAIA
    for (const athlete of athletes || []) {
      try {
        // Only update if not already NAIA
        if (athlete.division !== "NAIA") {
          const { error: updateError } = await supabase
            .from("athletes")
            .update({ division: "NAIA" })
            .eq("id", athlete.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          updates.push({
            id: athlete.id,
            oldDivision: athlete.division,
            newDivision: "NAIA",
          })
        }
      } catch (err) {
        console.error(`Error updating athlete ${athlete.id}:`, err)
        errors.push({
          id: athlete.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} Montreat College athletes to NAIA with ${errors.length} errors.`,
      updates,
      errors,
    })
  } catch (error) {
    console.error("Error in fix-montreat API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
