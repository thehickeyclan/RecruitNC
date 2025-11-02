import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const { schoolId } = params

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: school, error } = await supabase.from("schools").select("*").eq("id", schoolId).single()

    if (error) {
      console.error("[v0] Error fetching school branding:", error)
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    return NextResponse.json({ school })
  } catch (error) {
    console.error("[v0] Error in branding API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
