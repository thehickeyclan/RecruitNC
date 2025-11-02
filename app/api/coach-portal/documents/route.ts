import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: documents, error } = await supabase
      .from("coach_athlete_documents")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("uploaded_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const athleteId = formData.get("athleteId") as string

    console.log("[v0] Document POST request:", { fileName: file?.name, athleteId })

    if (!file || !athleteId) {
      return NextResponse.json({ error: "File and athlete ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    })

    console.log("[v0] File uploaded to blob:", blob.url)

    const { data, error } = await supabase
      .from("coach_athlete_documents")
      .insert({
        athlete_id: athleteId,
        coach_user_id: user.id,
        file_name: file.name,
        file_url: blob.url,
        file_type: file.type,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error details:", JSON.stringify(error, null, 2))
      throw error
    }

    console.log("[v0] Document created successfully:", data)
    return NextResponse.json({ document: data })
  } catch (error) {
    console.error("[v0] Error uploading document:", error)
    console.error("[v0] Error details:", error.message, error.details, error.hint)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("coach_athlete_documents").delete().eq("id", documentId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
