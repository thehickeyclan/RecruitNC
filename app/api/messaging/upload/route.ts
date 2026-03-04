import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"
import { nanoid } from "nanoid"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * POST: Upload image(s) for use in a message. Auth required; optional threadId to verify membership.
 * FormData: "file" (one or multiple), optional "threadId".
 * Returns { uploads: [{ url, content_type, filename }] }.
 */
export async function POST(request: NextRequest) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await request.formData()
  const threadId = (formData.get("threadId") as string)?.trim() || null

  if (threadId) {
    const supabase = await createClient()
    const { data: member } = await supabase
      .from("messaging_thread_members")
      .select("thread_id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .single()
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const files = formData.getAll("file") as File[]
  const validFiles = files.filter((f) => f && f.size > 0 && f.size <= MAX_FILE_SIZE && ALLOWED_TYPES.includes(f.type))
  if (validFiles.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one image file (JPEG, PNG, GIF, WebP; max 5MB each)" },
      { status: 400 }
    )
  }

  const prefix = `messaging/${threadId ?? "drafts"}/${user.id}`
  const uploads: { url: string; content_type: string; filename: string }[] = []

  for (const file of validFiles) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
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
      console.error("[messaging/upload]", err)
      return NextResponse.json(
        { error: "Upload failed: " + (err instanceof Error ? err.message : "Unknown error") },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ uploads })
}
