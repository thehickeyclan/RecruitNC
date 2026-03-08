import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nanoid } from "nanoid"

export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB for logo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * POST: Upload a logo for the forum group (room). FormData: "file" (single image).
 * Only group members can upload. Returns { logo_url }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: member } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file || !file.size || file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Provide one image file (JPEG, PNG, GIF, WebP; max 2MB)" },
      { status: 400 }
    )
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60)
  const pathname = `forum/groups/${groupId}/logo/${Date.now()}-${nanoid(8)}-${safeName}`

  let blobUrl: string
  try {
    const blob = await put(pathname, file, { access: "public" })
    blobUrl = blob.url
  } catch (err) {
    console.error("[forum/groups/logo]", err)
    return NextResponse.json(
      { error: "Upload failed: " + (err instanceof Error ? err.message : "Unknown error") },
      { status: 500 }
    )
  }

  const { error: updateErr } = await admin
    .from("forum_groups")
    .update({ logo_url: blobUrl })
    .eq("id", groupId)

  if (updateErr) {
    console.error("[forum/groups/logo] update", updateErr)
    return NextResponse.json({ error: "Failed to save logo" }, { status: 500 })
  }

  return NextResponse.json({ logo_url: blobUrl })
}
