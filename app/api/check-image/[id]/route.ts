import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  const supabase = createClient()

  const { data, error } = await supabase.from("athletes").select("id, name, photourl").eq("id", id).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
  }

  // Return info about the photourl without the full data
  return NextResponse.json({
    id: data.id,
    name: data.name,
    has_photourl: !!data.photourl,
    photourl_length: data.photourl ? data.photourl.length : 0,
    photourl_start: data.photourl ? data.photourl.substring(0, 50) + "..." : null,
    is_data_url: data.photourl ? data.photourl.startsWith("data:") : false,
  })
}
