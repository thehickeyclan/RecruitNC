import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// Get all custom entities of a specific type
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (!type) {
    return NextResponse.json({ error: "Type parameter is required" }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("custom_entities")
      .select("*")
      .eq("entity_type", type)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching custom entities:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in custom entities API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add a new custom entity
export async function POST(request: Request) {
  try {
    const { name, type } = await request.json()

    if (!name || !type) {
      return NextResponse.json({ error: "Missing required fields: name, type" }, { status: 400 })
    }

    // Normalize the name (capitalize first letter of each word)
    const normalizedName = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim()

    const supabase = createServerSupabaseClient()

    // Check if entity already exists
    const { data: existingData, error: checkError } = await supabase
      .from("custom_entities")
      .select("*")
      .eq("name", normalizedName)
      .eq("entity_type", type)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking for existing entity:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    // If entity already exists, return it
    if (existingData) {
      return NextResponse.json(existingData)
    }

    // Otherwise, insert the new entity
    const { data, error } = await supabase
      .from("custom_entities")
      .insert({
        name: normalizedName,
        entity_type: type,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving custom entity:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in custom entities API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
