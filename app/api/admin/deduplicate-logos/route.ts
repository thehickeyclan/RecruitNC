import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all logo mappings
    const { data: allMappings, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by entity_name and entity_type
    const groups: { [key: string]: any[] } = {}

    allMappings?.forEach((mapping) => {
      const key = `${mapping.entity_type}:${mapping.entity_name.toLowerCase().trim()}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(mapping)
    })

    // Find duplicates
    const duplicates = Object.entries(groups)
      .filter(([_, mappings]) => mappings.length > 1)
      .map(([key, mappings]) => ({
        key,
        count: mappings.length,
        mappings: mappings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }))

    return NextResponse.json({
      success: true,
      totalMappings: allMappings?.length || 0,
      duplicateGroups: duplicates.length,
      duplicates,
    })
  } catch (error) {
    console.error("Error finding duplicates:", error)
    return NextResponse.json({ error: "Failed to find duplicates" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { idsToDelete } = await request.json()

    if (!Array.isArray(idsToDelete)) {
      return NextResponse.json({ error: "Invalid IDs array" }, { status: 400 })
    }

    const supabase = createClient()

    // Delete the specified mappings
    const { error } = await supabase.from("logo_mappings").delete().in("id", idsToDelete)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedCount: idsToDelete.length,
    })
  } catch (error) {
    console.error("Error deleting duplicates:", error)
    return NextResponse.json({ error: "Failed to delete duplicates" }, { status: 500 })
  }
}
