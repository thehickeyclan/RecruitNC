import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Get all Liam records
    const { data: records, error } = await supabase
      .from("matches")
      .select("*")
      .or("wrestler_id.ilike.%liam%,first_name.ilike.%liam%")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching Liam records:", error)
      return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "No Liam records found" }, { status: 404 })
    }

    // Group by season and grade (case-insensitive)
    const seasonGroups: { [key: string]: any[] } = {}

    records.forEach((record) => {
      const seasonKey = `${record.season}_${record.grade}`.toLowerCase()
      if (!seasonGroups[seasonKey]) {
        seasonGroups[seasonKey] = []
      }
      seasonGroups[seasonKey].push(record)
    })

    // Find duplicates and keep only the most recent
    const toDelete: string[] = []
    let duplicateCount = 0

    Object.entries(seasonGroups).forEach(([seasonKey, seasonRecords]) => {
      if (seasonRecords.length > 1) {
        // Sort by created_at descending (most recent first)
        seasonRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        // Keep the first (most recent), delete the rest
        for (let i = 1; i < seasonRecords.length; i++) {
          toDelete.push(seasonRecords[i].id)
          duplicateCount++
        }
      }
    })

    if (toDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No duplicates found",
        deletedCount: 0,
      })
    }

    // Delete the duplicate records
    const { error: deleteError } = await supabase.from("matches").delete().in("id", toDelete)

    if (deleteError) {
      console.error("Error deleting duplicates:", deleteError)
      return NextResponse.json({ error: "Failed to delete duplicates" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${duplicateCount} duplicate records`,
      deletedCount: duplicateCount,
      deletedIds: toDelete,
    })
  } catch (error) {
    console.error("Error in cleanup duplicates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
