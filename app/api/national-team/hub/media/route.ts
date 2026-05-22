import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import {
  isMissingNhscaHubMediaTableError,
  nhscaHubMediaDbErrorMessage,
  NHSCA_HUB_MEDIA_EVENT_SLUG,
  NHSCA_HUB_MEDIA_MAX_IMAGE_BYTES,
  NHSCA_HUB_MEDIA_MAX_VIDEO_BYTES,
  NHSCA_HUB_MEDIA_SELECT,
  NHSCA_HUB_MEDIA_TABLE,
  nhscaHubMediaTypeFromMime,
  type NhscaHubMediaRow,
} from "@/lib/nhsca-hub-media"

export const dynamic = "force-dynamic"

function displayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata ?? {}
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    ""
  return name || user.email?.split("@")[0] || "Parent"
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const eventSlug = request.nextUrl.searchParams.get("event")?.trim() || NHSCA_HUB_MEDIA_EVENT_SLUG
  const admin = createAdminClientFresh()

  const { data, error } = await admin
    .from(NHSCA_HUB_MEDIA_TABLE)
    .select(
      "id, event_slug, user_id, uploader_email, uploader_name, media_type, url, filename, caption, content_type, created_at"
    )
    .eq("event_slug", eventSlug)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    if (isMissingNhscaHubMediaTableError(error.message)) {
      return NextResponse.json({
        items: [] as NhscaHubMediaRow[],
        tablesReady: false,
        message: "Run scripts/supabase-nhsca-hub-media.sql in Supabase.",
      })
    }
    console.error("[RecruitNC] nhsca hub media list", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: (data ?? []) as NhscaHubMediaRow[], tablesReady: true })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email || !user.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const formData = await request.formData()
  const eventSlug =
    (typeof formData.get("eventSlug") === "string" ? formData.get("eventSlug") : NHSCA_HUB_MEDIA_EVENT_SLUG)?.toString().trim() ||
    NHSCA_HUB_MEDIA_EVENT_SLUG
  const captionRaw = typeof formData.get("caption") === "string" ? formData.get("caption").trim() : ""
  const caption = captionRaw.slice(0, 500) || null
  const uploaderName =
    (typeof formData.get("uploaderName") === "string" ? formData.get("uploaderName").trim() : "") ||
    displayNameFromUser(user)

  const files = formData.getAll("file") as File[]
  const validFiles = files.filter((f) => f && f.size > 0)

  if (validFiles.length === 0) {
    return NextResponse.json({ error: "Choose at least one photo or video." }, { status: 400 })
  }
  if (validFiles.length > 10) {
    return NextResponse.json({ error: "Upload up to 10 files at a time." }, { status: 400 })
  }

  for (const file of validFiles) {
    const mediaType = nhscaHubMediaTypeFromMime(file.type)
    if (!mediaType) {
      return NextResponse.json(
        { error: "Use JPEG, PNG, GIF, WebP, HEIC, MP4, MOV, or WebM files only." },
        { status: 400 }
      )
    }
    const max = mediaType === "video" ? NHSCA_HUB_MEDIA_MAX_VIDEO_BYTES : NHSCA_HUB_MEDIA_MAX_IMAGE_BYTES
    if (file.size > max) {
      return NextResponse.json(
        {
          error:
            mediaType === "video"
              ? "Each video must be 80 MB or smaller."
              : "Each photo must be 10 MB or smaller.",
        },
        { status: 400 }
      )
    }
  }

  const admin = createAdminClientFresh()
  const inserted: NhscaHubMediaRow[] = []

  for (const file of validFiles) {
    const mediaType = nhscaHubMediaTypeFromMime(file.type)!
    const ext = file.name.split(".").pop()?.toLowerCase() || (mediaType === "video" ? "mp4" : "jpg")
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80)
    const storagePath = `nhsca-hub-media/${eventSlug}/${user.id}/${Date.now()}-${nanoid(8)}-${safeName || `file.${ext}`}`

    let url: string
    try {
      const blob = await put(storagePath, file, { access: "public" })
      url = blob.url
    } catch (err) {
      console.error("[RecruitNC] nhsca hub media upload blob", err)
      return NextResponse.json(
        { error: "Upload failed. Try again or use a smaller file." },
        { status: 500 }
      )
    }

    const { data, error } = await admin
      .from(NHSCA_HUB_MEDIA_TABLE)
      .insert({
        event_slug: eventSlug,
        user_id: user.id,
        uploader_email: user.email,
        uploader_name: uploaderName,
        media_type: mediaType,
        url,
        storage_path: storagePath,
        filename: file.name,
        caption,
        content_type: file.type,
        file_size_bytes: file.size,
      })
      .select(NHSCA_HUB_MEDIA_SELECT)
      .single()

    if (error) {
      console.error("[RecruitNC] nhsca hub media insert", error)
      if (isMissingNhscaHubMediaTableError(error.message)) {
        return NextResponse.json(
          {
            error: "Media gallery is not set up yet. Run scripts/supabase-nhsca-hub-media.sql in Supabase.",
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: nhscaHubMediaDbErrorMessage(error.message, error.code) },
        { status: 500 }
      )
    }

    inserted.push({ ...(data as NhscaHubMediaRow), like_count: 0, liked_by_me: false })
  }

  return NextResponse.json({ items: inserted })
}
