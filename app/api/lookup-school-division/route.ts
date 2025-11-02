import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { schoolName } = await request.json()

    if (!schoolName) {
      return NextResponse.json({ division: null })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    // Try exact match first
    let { data, error } = await supabase
      .from("school_divisions")
      .select("division")
      .ilike("school_name", schoolName)
      .single()

    // If no exact match, try fuzzy matching
    if (!data && !error) {
      const cleanSchoolName = schoolName.replace(/\s+(high\s+school|hs|academy|school)$/i, "").trim()
      ;({ data, error } = await supabase
        .from("school_divisions")
        .select("division")
        .ilike("school_name", `%${cleanSchoolName}%`)
        .single())
    }

    if (error && error.code !== "PGRST116") {
      console.error("Database error:", error)
      return NextResponse.json({ division: null })
    }

    return NextResponse.json({ division: data?.division || null })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ division: null })
  }
}
