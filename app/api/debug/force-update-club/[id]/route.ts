import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Get the request body
    const body = await request.json()
    const { wrestlingClub } = body

    if (!wrestlingClub) {
      return NextResponse.json({ error: "Wrestling club is required" }, { status: 400 })
    }

    const supabase = createClient()

    // First, get the current data
    const { data: currentData, error: fetchError } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (fetchError) {
      console.error(`Error fetching athlete with ID ${id}:`, fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!currentData) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    console.log(`Current wrestling club for athlete ${id}:`, currentData.wrestlingClub)

    // Update only the wrestling club field
    const { data, error } = await supabase.from("athletes").update({ wrestlingClub }).eq("id", id).select().single()

    if (error) {
      console.error(`Error updating wrestling club for athlete ${id}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 })
    }

    console.log(`Updated wrestling club for athlete ${id} to:`, data.wrestlingClub)

    // Revalidate paths
    revalidatePath("/admin/athletes")
    revalidatePath(`/athletes/${id}`)
    revalidatePath("/")

    return NextResponse.json({
      success: true,
      message: `Wrestling club updated from "${currentData.wrestlingClub}" to "${data.wrestlingClub}"`,
      before: currentData,
      after: data,
    })
  } catch (error) {
    console.error("Error in POST /api/debug/force-update-club/[id]:", error)
    return NextResponse.json({ error: "Failed to update wrestling club" }, { status: 500 })
  }
}
