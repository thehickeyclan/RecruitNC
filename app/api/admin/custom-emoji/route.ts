import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import sharp from "sharp"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EMOJI_SIZE = 64
const CATEGORIES = ["hs", "college", "club", "ncu", "other"] as const

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin access required" }
  return { ok: true }
}

/**
 * GET: List all custom emoji (admin view).
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("custom_emoji")
    .select("id, slug, image_url, category, display_name, sort_order, created_at")
    .order("category")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true })

  if (error) {
    console.error("[admin/custom-emoji GET]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ emoji: data ?? [] })
}

/**
 * POST: Add custom emoji. FormData: file (image), slug (optional, derived from filename if missing),
 * category (hs|college|club|ncu|other), display_name (optional).
 * Image is resized to EMOJI_SIZE x EMOJI_SIZE and stored in Blob.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  let slug = (formData.get("slug") as string)?.trim()
  const category = (formData.get("category") as string)?.trim().toLowerCase()
  const displayName = (formData.get("display_name") as string)?.trim() || null

  if (!file?.size) return NextResponse.json({ error: "File is required" }, { status: 400 })
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Category must be one of: hs, college, club, ncu, other" }, { status: 400 })
  }

  if (!slug) slug = slugify(file.name.replace(/\.[^.]+$/, "")) || "emoji"
  slug = slugify(slug) || "emoji"

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "File must be JPEG, PNG, GIF, or WebP" }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch (e) {
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 })
  }

  let resized: Buffer
  try {
    resized = await sharp(buffer)
      .resize(EMOJI_SIZE, EMOJI_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  } catch (e) {
    console.error("[admin/custom-emoji] sharp error:", e)
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 })
  }

  const pathname = `custom-emoji/${category}/${slug}-${Date.now()}.png`
  let blobUrl: string
  try {
    const blob = await put(pathname, resized, { access: "public", contentType: "image/png" })
    blobUrl = blob.url
  } catch (e) {
    console.error("[admin/custom-emoji] blob upload error:", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  const adminClient = createAdminClient()
  const { data: row, error: insertError } = await adminClient
    .from("custom_emoji")
    .insert({
      slug,
      image_url: blobUrl,
      category,
      display_name: displayName,
      sort_order: 0,
    })
    .select("id, slug, image_url, category, display_name, sort_order, created_at")
    .single()

  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ error: "Slug already exists: " + slug }, { status: 409 })
    console.error("[admin/custom-emoji] insert error:", insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(row)
}
