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

  // Check if the photourl starts with "data:image/"
  const isValidDataUrl = hayden.photourl && hayden.photourl.startsWith("data:image/")

  // Return basic info without the full data URL for security
  return NextResponse.json({
    id: hayden.id,
    name: hayden.name,
    has_photo: !!hayden.photourl,
    photo_starts_with_data_image: isValidDataUrl,
    photo_length: hayden.photourl ? hayden.photourl.length : 0,
    photo_preview: hayden.photourl ? hayden.photourl.substring(0, 50) + "..." : null,
  })
}
