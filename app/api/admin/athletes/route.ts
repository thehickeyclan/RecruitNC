import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  console.log("[v0] Admin Athletes API: ===== ROUTE CALLED =====")
  console.log("[v0] Admin Athletes API: Request URL:", request.url)
  console.log("[v0] Admin Athletes API: Request method:", request.method)

  try {
    console.log("[v0] Admin Athletes API: Starting request")

    // Not createServerClient: with the session cookies attached the query runs as the signed-in
    // user, and the column grants on athletes refuse select("*"). Middleware has already
    // checked the caller is an admin (lib/admin-api-gate.ts).
    const supabase = createAdminClient()

    console.log("[v0] Admin Athletes API: Querying database for all athletes")

    /*
     * Every athlete, a page at a time. One query returns at most 1,000 rows, so once the table
     * passed that (2,403 with the Virginia and South Carolina profiles, 22 October 2026) everyone
     * after about "J" never reached the page and the search could not find Tobin McNair.
     */
    const PAGE = 1000
    const athletes: any[] = []
    let error: unknown = null
    for (let from = 0; ; from += PAGE) {
      const page = await supabase.from("athletes").select("*").order("name", { ascending: true }).order("id").range(from, from + PAGE - 1)
      if (page.error) {
        error = page.error
        break
      }
      athletes.push(...(page.data ?? []))
      if ((page.data ?? []).length < PAGE) break
    }

    if (error) {
      console.error("[v0] Admin Athletes API: Database error:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    console.log(`[v0] Admin Athletes API: Fetched ${athletes?.length || 0} total athletes (including prospects)`)

    const tobinMcnair = athletes?.find((athlete) => {
      const name = athlete.name?.toLowerCase() || ""
      return (
        (name.includes("tobin") && name.includes("mcnair")) || name.includes("tobin mcnair") || name === "tobin mcnair"
      )
    })

    if (tobinMcnair) {
      console.log("[v0] Admin Athletes API: ✅ FOUND Tobin McNair:", {
        id: tobinMcnair.id,
        name: tobinMcnair.name,
        is_prospect: tobinMcnair.is_prospect,
        recruiting_status: tobinMcnair.recruiting_status,
        college: tobinMcnair.college,
        highschool: tobinMcnair.highschool,
      })
    } else {
      console.log("[v0] Admin Athletes API: ❌ Tobin McNair NOT FOUND in results")
      const allNames = athletes?.map((a) => a.name).filter(Boolean) || []
      console.log("[v0] Admin Athletes API: All athlete names:", allNames)

      const partialMatches =
        athletes?.filter((a) => {
          const name = a.name?.toLowerCase() || ""
          return name.includes("tobin") || name.includes("mcnair")
        }) || []
      console.log(
        "[v0] Admin Athletes API: Partial name matches:",
        partialMatches.map((a) => a.name),
      )
    }

    console.log("[v0] Admin Athletes API: Returning response with", athletes?.length || 0, "athletes")
    return NextResponse.json(athletes || [])
  } catch (error) {
    console.error("[v0] Admin Athletes API: ❌ UNEXPECTED ERROR:", error)
    console.error("[v0] Admin Athletes API: Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
