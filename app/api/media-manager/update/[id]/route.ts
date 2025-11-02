import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    console.log("=== UPDATE START ===")
    console.log("ID:", id)
    console.log("Body:", body)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("media_items")
      .update({
        college_name: body.college_name,
        alt_text: body.alt_text,
        division: body.division,
        entity_type: body.entity_type,
        description: body.description,
        is_active: body.is_active !== undefined ? body.is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    console.log("=== UPDATE SUCCESS ===")
    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error("Update exception:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
