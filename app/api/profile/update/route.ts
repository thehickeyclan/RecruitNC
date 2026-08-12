import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { normalizePhoneForStorage } from "@/lib/phone-format"

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
  const {
    name,
    role,
    cell_phone,
    location,
    bio,
    notify_sms_new_messages,
    notify_email_new_messages,
    notify_sms_fundraising_activation,
    headshot_url,
  } = body

  const updatePayload: Record<string, unknown> = {}
  if (name !== undefined) updatePayload.full_name = name
  if (role !== undefined) updatePayload.role = role
  if (cell_phone !== undefined) updatePayload.cell_phone = normalizePhoneForStorage(cell_phone)
  if (location !== undefined) updatePayload.location = location
  if (bio !== undefined) updatePayload.bio = bio
  if (typeof notify_sms_new_messages === "boolean") updatePayload.notify_sms_new_messages = notify_sms_new_messages
  if (typeof notify_email_new_messages === "boolean") updatePayload.notify_email_new_messages = notify_email_new_messages
  if (typeof notify_sms_fundraising_activation === "boolean") {
    updatePayload.notify_sms_fundraising_activation = notify_sms_fundraising_activation
  }
  if (headshot_url !== undefined) updatePayload.headshot_url = headshot_url === "" || headshot_url === null ? null : headshot_url

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  let { data, error } = await supabase
    .from("user_profiles")
    .update(updatePayload)
    .eq("user_id", user.id)
    .select()
    .single()

  // If any column doesn't exist (e.g. location, bio, updated_at), retry with only name + cell_phone
  if (error) {
    const msg = String(error.message || "").toLowerCase()
    const maybeMissingColumn = msg.includes("column") && (msg.includes("does not exist") || msg.includes("undefined"))
    if (
      maybeMissingColumn &&
      (updatePayload.location !== undefined ||
        updatePayload.bio !== undefined ||
        updatePayload.role !== undefined ||
        updatePayload.notify_sms_new_messages !== undefined ||
        updatePayload.notify_email_new_messages !== undefined ||
        updatePayload.notify_sms_fundraising_activation !== undefined)
    ) {
      const safePayload: Record<string, unknown> = {}
      if (name !== undefined) safePayload.full_name = name
      if (cell_phone !== undefined) safePayload.cell_phone = normalizePhoneForStorage(cell_phone)
      if (Object.keys(safePayload).length > 0) {
        const retry = await supabase
          .from("user_profiles")
          .update(safePayload)
          .eq("user_id", user.id)
          .select()
          .single()
        if (!retry.error) {
          return NextResponse.json({ profile: retry.data })
        }
      }
    }
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
