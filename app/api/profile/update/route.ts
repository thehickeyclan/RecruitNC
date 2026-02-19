import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

async function handleUpdate(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { name, role, cell_phone, location, bio } = body

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (name !== undefined) updatePayload.name = name
  if (role !== undefined) updatePayload.role = role
  if (cell_phone !== undefined) updatePayload.cell_phone = cell_phone
  if (location !== undefined) updatePayload.location = location
  if (bio !== undefined) updatePayload.bio = bio

  let { data, error } = await supabase
    .from("user_profiles")
    .update(updatePayload)
    .eq("user_id", user.id)
    .select()
    .single()

  // If location/bio columns don't exist yet, retry without them so name/cell_phone still save
  if (error && (updatePayload.location !== undefined || updatePayload.bio !== undefined)) {
    const msg = String(error.message || "")
    if (msg.includes("location") || msg.includes("bio")) {
      delete updatePayload.location
      delete updatePayload.bio
      const retry = await supabase
        .from("user_profiles")
        .update(updatePayload)
        .eq("user_id", user.id)
        .select()
        .single()
      if (!retry.error) {
        return NextResponse.json({ profile: retry.data })
      }
      error = retry.error
    }
  }

  if (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

export async function PUT(request: Request) {
  try {
    return await handleUpdate(request)
  } catch (error: unknown) {
    console.error("Profile update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    return await handleUpdate(request)
  } catch (error: unknown) {
    console.error("Profile update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
