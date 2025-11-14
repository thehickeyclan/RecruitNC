import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()

  // Fetch Hayden directly from the database
  const { data: hayden, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!hayden) {
    return NextResponse.json({ error: "Hayden not found" }, { status: 404 })
  }

  // Return the data with photourl length for debugging
  return NextResponse.json({
    ...hayden,
    photourl_length: hayden.photourl ? hayden.photourl.length : 0,
    photourl_preview: hayden.photourl ? hayden.photourl.substring(0, 100) + "..." : null,
  })
}
