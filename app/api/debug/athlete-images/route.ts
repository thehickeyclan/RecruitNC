import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    let query = supabase.from("athletes").select("*")

    // If a name is provided, filter by that name
    if (name) {
      query = query.ilike("name", `%${name}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract relevant image fields for debugging
    const imageData = data.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      photourl: athlete.photourl,
      commitmentphotourl: athlete.commitmentphotourl,
      photo: athlete.photo,
      image: athlete.image,
      allFields: Object.keys(athlete),
    }))

    return NextResponse.json({ athletes: imageData })
  } catch (error) {
    console.error("Error in athlete images debug endpoint:", error)
    return NextResponse.json({ error: "Failed to fetch athlete image data" }, { status: 500 })
  }
}
