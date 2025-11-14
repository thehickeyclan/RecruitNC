import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data, error } = await supabase
      .from("media_usage")
      .select(`
        *,
        media_items (
          filename,
          original_name,
          url,
          category
        )
      `)
      .eq("media_id", id)

    if (error) {
      console.error("Error fetching media usage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params
    const body = await request.json()

    const { used_in_table, used_in_column, used_in_record_id, usage_context } = body

    const { data, error } = await supabase
      .from("media_usage")
      .insert({
        media_id: id,
        used_in_table,
        used_in_column,
        used_in_record_id,
        usage_context,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating media usage record:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
