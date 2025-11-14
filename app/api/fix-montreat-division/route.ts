import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Update Montreat specifically to NAIA
    const { data: updateResult, error: updateError } = await supabase
      .from("athletes")
      .update({ division: "NAIA" })
      .ilike("college", "%montreat%")

    if (updateError) {
      console.error("Error updating Montreat division:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 },
      )
    }

    // Get count of updated records
    const { data: countResult, error: countError } = await supabase
      .from("athletes")
      .select("id", { count: "exact" })
      .ilike("college", "%montreat%")
      .eq("division", "NAIA")

    if (countError) {
      console.error("Error counting updated records:", countError)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated Montreat to NAIA division`,
      updatedCount: countResult?.length || 0,
    })
  } catch (error) {
    console.error("Error in fix-montreat-division:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
