import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // List files from the storage bucket
    const { data: files, error } = await supabase.storage.from("images").list("colleges", {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, files })
  } catch (error) {
    console.error("Error listing files:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
