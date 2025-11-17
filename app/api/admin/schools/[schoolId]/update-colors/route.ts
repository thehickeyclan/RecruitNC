import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(
  req: Request,
  { params }: { params: { schoolId: string } },
) {
  try {
    const schoolId = params.schoolId
    const { primaryColor, secondaryColor } = await req.json()

    // Validate hex colors if provided
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return NextResponse.json({ error: "Invalid primary color format" }, { status: 400 })
    }
    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return NextResponse.json({ error: "Invalid secondary color format" }, { status: 400 })
    }

    // Update school colors
    const { data, error } = await supabase
      .from("schools")
      .update({
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
      })
      .eq("id", schoolId)
      .select()
      .single()

    if (error) {
      console.error("Error updating school colors:", error)
      return NextResponse.json({ error: "Failed to update school colors" }, { status: 500 })
    }

    return NextResponse.json({ success: true, school: data })
  } catch (e: any) {
    console.error("Error in update-colors API:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}

