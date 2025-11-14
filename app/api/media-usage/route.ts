import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { list } from "@vercel/blob"

export async function GET() {
  try {
    console.log("=== MEDIA USAGE API CALLED ===")

    const supabase = createClient()

    // Get all blobs to check usage
    const { blobs } = await list()
    console.log(`Checking usage for ${blobs.length} blobs`)

    const usage: Record<string, { table: string; column: string; count: number; examples: string[] }> = {}

    // Check each blob URL in various tables
    for (const blob of blobs) {
      const url = blob.url
      let totalUsage = 0
      const examples: string[] = []

      // Check athletes table
      const { data: athletes } = await supabase.from("athletes").select("name, image_url").eq("image_url", url).limit(5)

      if (athletes && athletes.length > 0) {
        totalUsage += athletes.length
        examples.push(...athletes.map((a) => a.name))

        if (!usage[url]) {
          usage[url] = { table: "athletes", column: "image_url", count: 0, examples: [] }
        }
        usage[url].count += athletes.length
        usage[url].examples.push(...examples)
      }

      // Check colleges table (if exists)
      try {
        const { data: colleges } = await supabase.from("colleges").select("name, logo_url").eq("logo_url", url).limit(5)

        if (colleges && colleges.length > 0) {
          totalUsage += colleges.length
          examples.push(...colleges.map((c) => c.name))

          if (!usage[url]) {
            usage[url] = { table: "colleges", column: "logo_url", count: 0, examples: [] }
          }
          usage[url].count += colleges.length
          usage[url].examples.push(...examples)
        }
      } catch (error) {
        // Table might not exist, continue
      }

      // Check high_schools table (if exists)
      try {
        const { data: schools } = await supabase
          .from("high_schools")
          .select("name, logo_url")
          .eq("logo_url", url)
          .limit(5)

        if (schools && schools.length > 0) {
          totalUsage += schools.length
          examples.push(...schools.map((s) => s.name))

          if (!usage[url]) {
            usage[url] = { table: "high_schools", column: "logo_url", count: 0, examples: [] }
          }
          usage[url].count += schools.length
          usage[url].examples.push(...examples)
        }
      } catch (error) {
        // Table might not exist, continue
      }

      // Check clubs table (if exists)
      try {
        const { data: clubs } = await supabase.from("clubs").select("name, logo_url").eq("logo_url", url).limit(5)

        if (clubs && clubs.length > 0) {
          totalUsage += clubs.length
          examples.push(...clubs.map((c) => c.name))

          if (!usage[url]) {
            usage[url] = { table: "clubs", column: "logo_url", count: 0, examples: [] }
          }
          usage[url].count += clubs.length
          usage[url].examples.push(...examples)
        }
      } catch (error) {
        // Table might not exist, continue
      }
    }

    console.log(`Found usage data for ${Object.keys(usage).length} files`)

    return NextResponse.json(usage)
  } catch (error) {
    console.error("Usage tracking error:", error)
    return NextResponse.json(
      {
        error: "Failed to track usage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
