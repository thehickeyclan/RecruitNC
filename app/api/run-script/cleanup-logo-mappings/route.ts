import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    console.log("🧹 Starting logo mappings cleanup...")

    // Step 1: Get initial count
    const { count: initialCount, error: countError } = await supabase
      .from("logo_mappings")
      .select("*", { count: "exact", head: true })

    if (countError) {
      throw new Error(`Failed to get initial count: ${countError.message}`)
    }

    console.log(`📊 Initial record count: ${initialCount}`)

    // Step 2: Standardize entity_type values
    console.log("🔧 Standardizing entity_type values...")

    // Update high school variations
    await supabase
      .from("logo_mappings")
      .update({ entity_type: "highschool" })
      .in("entity_type", ["High-School", "Highschool", "high-school", "High School"])

    // Update college variations
    await supabase
      .from("logo_mappings")
      .update({ entity_type: "college" })
      .in("entity_type", ["College", "University", "university"])

    // Update club variations
    await supabase
      .from("logo_mappings")
      .update({ entity_type: "club" })
      .in("entity_type", ["Club", "wrestling-club", "Wrestling Club"])

    // Step 3: Clean up specific entity names
    console.log("🔧 Cleaning up entity names...")

    // Cardinal Gibbons variations
    const { data: cardinalGibbons } = await supabase
      .from("logo_mappings")
      .select("*")
      .or("entity_name.ilike.%cardinal gibbons%,entity_name.ilike.%cardinal-gibbons%")

    if (cardinalGibbons && cardinalGibbons.length > 0) {
      await supabase
        .from("logo_mappings")
        .update({ entity_name: "Cardinal Gibbons High School" })
        .or("entity_name.ilike.%cardinal gibbons%,entity_name.ilike.%cardinal-gibbons%")
    }

    // App State variations
    const { data: appState } = await supabase
      .from("logo_mappings")
      .select("*")
      .or("entity_name.ilike.%app state%,entity_name.ilike.%appalachian state%")

    if (appState && appState.length > 0) {
      await supabase
        .from("logo_mappings")
        .update({ entity_name: "Appalachian State University" })
        .or("entity_name.ilike.%app state%,entity_name.ilike.%appalachian state%")
    }

    // UNC variations
    const { data: unc } = await supabase
      .from("logo_mappings")
      .select("*")
      .or("entity_name.ilike.%unc chapel hill%,entity_name.ilike.%university of north carolina%")

    if (unc && unc.length > 0) {
      await supabase
        .from("logo_mappings")
        .update({ entity_name: "University of North Carolina at Chapel Hill" })
        .or("entity_name.ilike.%unc chapel hill%,entity_name.ilike.%university of north carolina%")
    }

    // NC State variations
    const { data: ncState } = await supabase
      .from("logo_mappings")
      .select("*")
      .or("entity_name.ilike.%nc state%,entity_name.ilike.%north carolina state%")

    if (ncState && ncState.length > 0) {
      await supabase
        .from("logo_mappings")
        .update({ entity_name: "North Carolina State University" })
        .or("entity_name.ilike.%nc state%,entity_name.ilike.%north carolina state%")
    }

    // Step 4: Find and remove duplicates
    console.log("🗑️ Finding and removing duplicates...")

    const { data: allRecords } = await supabase
      .from("logo_mappings")
      .select("*")
      .order("created_at", { ascending: false })

    if (!allRecords) {
      throw new Error("Failed to fetch records for duplicate removal")
    }

    // Group by entity_name + entity_type to find duplicates
    const seen = new Set<string>()
    const duplicateIds: string[] = []

    for (const record of allRecords) {
      const key = `${record.entity_name.toLowerCase().trim()}-${record.entity_type}`

      if (seen.has(key)) {
        duplicateIds.push(record.id)
      } else {
        seen.add(key)
      }
    }

    console.log(`🗑️ Found ${duplicateIds.length} duplicates to remove`)

    // Remove duplicates in batches
    if (duplicateIds.length > 0) {
      const batchSize = 100
      for (let i = 0; i < duplicateIds.length; i += batchSize) {
        const batch = duplicateIds.slice(i, i + batchSize)
        await supabase.from("logo_mappings").delete().in("id", batch)
      }
    }

    // Step 5: Remove broken URLs
    console.log("🧹 Removing broken URLs...")

    const { data: brokenUrls } = await supabase
      .from("logo_mappings")
      .delete()
      .or("logo_url.is.null,logo_url.eq.,logo_url.like.%undefined%,logo_url.like.%null%")
      .select()

    console.log(`🗑️ Removed ${brokenUrls?.length || 0} records with broken URLs`)

    // Step 6: Get final statistics
    const { count: finalCount } = await supabase.from("logo_mappings").select("*", { count: "exact", head: true })

    const { data: typeBreakdown } = await supabase.from("logo_mappings").select("entity_type")

    const typeStats: { [key: string]: number } = {}
    typeBreakdown?.forEach((record) => {
      typeStats[record.entity_type] = (typeStats[record.entity_type] || 0) + 1
    })

    const statistics = {
      initialCount: initialCount || 0,
      finalCount: finalCount || 0,
      removedCount: (initialCount || 0) - (finalCount || 0),
      duplicatesRemoved: duplicateIds.length,
      typeBreakdown: typeStats,
    }

    console.log("✅ Cleanup completed successfully:", statistics)

    return NextResponse.json({
      success: true,
      message: "Logo mappings cleanup completed successfully",
      statistics,
    })
  } catch (error) {
    console.error("❌ Logo mappings cleanup failed:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Logo mappings cleanup failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
