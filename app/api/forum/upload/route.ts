import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { nanoid } from "nanoid"

export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * POST: Upload image(s) for use in a forum channel message.
 * FormData: "file" (one or multiple), "channelId" (required – verifies membership).
 * Returns { uploads: [{ url, content_type, filename }] }.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await request.formData()
  const channelId = (formData.get("channelId") as string)?.trim()
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: channel } = await admin
    .from("forum_channels")
    .select("id, group_id")
    .eq("id", channelId)
    .single()
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 })

  const { data: member } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", (channel as { group_id: string }).group_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })

  const files = formData.getAll("file") as File[]
  const validFiles = files.filter((f) => f && f.size > 0 && f.size <= MAX_FILE_SIZE && ALLOWED_TYPES.includes(f.type))
  if (validFiles.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one image file (JPEG, PNG, GIF, WebP; max 5MB each)" },
      { status: 400 }
    )
  }

  const prefix = `forum/${channelId}/${user.id}`
  const uploads: { url: string; content_type: string; filename: string }[] = []

  for (const file of validFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80)
    const pathname = `${prefix}/${Date.now()}-${nanoid(8)}-${safeName}`

    try {
      const blob = await put(pathname, file, { access: "public" })
      uploads.push({
        url: blob.url,
        content_type: file.type,
        filename: file.name,
      })
    } catch (err) {
      console.error("[forum/upload]", err)
      return NextResponse.json(
        { error: "Upload failed: " + (err instanceof Error ? err.message : "Unknown error") },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ uploads })
}
