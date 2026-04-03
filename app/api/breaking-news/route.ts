import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabase = createClient(process.env.SUPABASE_SUPABASE_URL!, process.env.SUPABASE_SUPABASE_ANON_KEY!)

    const { data, error } = await supabase
      .from("breaking_news")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error fetching breaking news:", error)
    return NextResponse.json({ error: "Failed to fetch breaking news" }, { status: 500 })
  }
}
