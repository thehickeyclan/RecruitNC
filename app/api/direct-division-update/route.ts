import { NextResponse } from "next/server"
import { adminGate } from "@/lib/admin-gate"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const denied = await adminGate()
  if (denied) return denied

  try {
    const { college, division } = await request.json()

    if (!college || !division) {
      return NextResponse.json({ error: "College and division are required" }, { status: 400 })
    }

    const supabase = createClient()

    // Direct update using SQL for maximum reliability
    const { data, error, count } = await supabase.from("athletes").update({ division }).ilike("college", `%${college}%`)

    if (error) {
      console.error("Error updating divisions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      message: `Updated ${count || 0} athletes with college matching "${college}" to division "${division}".`,
    })
  } catch (error) {
    console.error("Error in direct division update:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
