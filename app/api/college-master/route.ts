import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { data: colleges, error } = await supabase.from("college_master").select("*").order("name")

    if (error) {
      console.error("Error fetching colleges:", error)
      return NextResponse.json({ error: "Failed to fetch colleges" }, { status: 500 })
    }

    return NextResponse.json({ colleges: colleges || [] })
  } catch (error) {
    console.error("Error in get colleges:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, division, aliases } = body

    if (!name) {
      return NextResponse.json({ error: "College name is required" }, { status: 400 })
    }

    // Insert new college
    const { data: college, error: insertError } = await supabase
      .from("college_master")
      .insert({
        name: name.trim(),
        division: division || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting college:", insertError)
      return NextResponse.json({ error: "Failed to create college" }, { status: 500 })
    }

    // Insert aliases if provided
    if (aliases && aliases.length > 0 && college) {
      const aliasRecords = aliases.map((alias: string) => ({
        college_id: college.id,
        alias: alias.trim(),
        created_at: new Date().toISOString(),
      }))

      const { error: aliasError } = await supabase.from("college_aliases").insert(aliasRecords)

      if (aliasError) {
        console.error("Error inserting aliases:", aliasError)
        // Don't fail the whole operation for alias errors
      }
    }

    return NextResponse.json({ college })
  } catch (error) {
    console.error("Error in create college:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
