import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  console.log("[v0] Admin Athletes API: ===== ROUTE CALLED =====")
  console.log("[v0] Admin Athletes API: Request URL:", request.url)
  console.log("[v0] Admin Athletes API: Request method:", request.method)

  try {
    console.log("[v0] Admin Athletes API: Starting request")

    const cookieStore = cookies()
    console.log("[v0] Admin Athletes API: Got cookie store")

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })
    console.log("[v0] Admin Athletes API: Created Supabase client")

    console.log("[v0] Admin Athletes API: Querying database for all athletes")

    const { data: athletes, error } = await supabase.from("athletes").select("*").order("name", { ascending: true })

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
