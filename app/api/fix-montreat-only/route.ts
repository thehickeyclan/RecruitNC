import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    console.log("Starting Montreat-only division fix...")

    // Step 1: Check current Montreat records
    const { data: beforeData, error: beforeError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .ilike("college", "%montreat%")

    if (beforeError) {
      console.error("Error checking Montreat records:", beforeError)
      return NextResponse.json({ error: beforeError.message }, { status: 500 })
    }

    console.log("Found Montreat records:", beforeData)

    // Step 2: Update ONLY Montreat to NAIA
    const { data: updateData, error: updateError } = await supabase
      .from("athletes")
      .update({
        division: "NAIA",
        updated_at: new Date().toISOString(),
      })
      .ilike("college", "%montreat%")
      .select("id, name, college, division")

    if (updateError) {
      console.error("Error updating Montreat:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log("Updated Montreat records:", updateData)

    // Step 3: Verify the change
    const { data: afterData, error: afterError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .ilike("college", "%montreat%")

    if (afterError) {
      console.error("Error verifying Montreat records:", afterError)
    }

    return NextResponse.json({
      success: true,
      message: "Successfully updated Montreat College to NAIA",
      beforeCount: beforeData?.length || 0,
      updatedCount: updateData?.length || 0,
      beforeRecords: beforeData,
      updatedRecords: updateData,
      afterRecords: afterData,
    })
  } catch (error) {
    console.error("Error in fix-montreat-only:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
