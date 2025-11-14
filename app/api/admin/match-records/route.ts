import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("matches").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching match records:", error)
      return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error in match records API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
