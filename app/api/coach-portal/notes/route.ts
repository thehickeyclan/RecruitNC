import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: notes, error } = await supabase
      .from("coach_athlete_notes")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { athleteId, note } = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("coach_athlete_notes")
      .insert({
        athlete_id: athleteId,
        coach_user_id: user.id,
        note,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ note: data })
  } catch (error) {
    console.error("Error adding note:", error)
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get("noteId")

    if (!noteId) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("coach_athlete_notes").delete().eq("id", noteId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { noteId, note } = await request.json()

    if (!noteId) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("coach_athlete_notes")
      .update({ note })
      .eq("id", noteId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ note: data })
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
  }
}
