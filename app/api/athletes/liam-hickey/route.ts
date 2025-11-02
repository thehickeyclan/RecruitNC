import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data: athlete, error } = await supabase.from("athletes").select("*").ilike("name", "%liam hickey%").single()

    if (error) {
      console.error("Error fetching Liam:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, athlete })
  } catch (error) {
    console.error("Exception fetching Liam:", error)
    return NextResponse.json({ error: "Failed to fetch athlete" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const supabase = createClient()

    // Update Liam's high school to use Cardinal Gibbons logo
    const { data, error } = await supabase
      .from("athletes")
      .update({
        highschool: "Cardinal Gibbons High School",
      })
      .ilike("name", "%liam hickey%")
      .select()
      .single()

    if (error) {
      console.error("Error updating Liam:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, athlete: data })
  } catch (error) {
    console.error("Exception updating Liam:", error)
    return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 })
  }
}
