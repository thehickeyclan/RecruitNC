import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { athleteId, athleteName, grade } = await request.json()

    if (!athleteId || !athleteName) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: athleteId and athleteName",
      })
    }

    // Create Supabase client
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Build the delete query
    let query = supabase.from("matches").delete().eq("athlete_id", athleteId)

    // Add grade filter if specified
    if (grade) {
      query = query.eq("grade", grade)
    }

    // Execute the deletion
    const { data, error, count } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`,
      })
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
      athleteName,
      grade: grade || "All grades",
      message: `Successfully cleared ${count || 0} match records`,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
}
