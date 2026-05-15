import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import {
  normalizeFundraisingProfileSlug,
  resolveFundraisingAthletePublic,
} from "@/lib/fundraising/athlete-fundraising-profiles"
import {
  extensionForVideoMime,
  fundraisingVideoObjectPath,
  fundraisingVideoThumbnailPath,
  FUNDRAISING_VIDEOS_BUCKET,
} from "@/lib/fundraising/fundraising-video-storage"

const MAX_VIDEO_BYTES = 100 * 1024 * 1024

type Body = { mime?: string; videoSize?: number; hasThumbnail?: boolean }

/**
 * Returns Supabase signed upload tokens so the browser can upload directly to Storage
 * (avoids Vercel App Router body-size limits on multipart POSTs).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: slugRaw } = await params
  const slug = normalizeFundraisingProfileSlug(slugRaw)
  if (slug.length < 2) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 })
  }

  const mime = typeof body.mime === "string" ? body.mime.split(";")[0]!.trim().toLowerCase() : ""
  const ext = extensionForVideoMime(mime)
  if (!ext) {
    return NextResponse.json({ error: "Use MP4, WebM, or MOV (QuickTime)." }, { status: 400 })
  }

  const size = typeof body.videoSize === "number" ? body.videoSize : 0
  if (size < 1 || size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Video must be 100MB or smaller" }, { status: 400 })
  }

  const hasThumbnail = body.hasThumbnail === true

  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  const profile = resolved?.profile
  if (!profile?.id || !profile.athlete_id) {
    return NextResponse.json({ error: "Fundraising profile not found for this page" }, { status: 404 })
  }

  const athleteId = profile.athlete_id
  const allowed = await userCanManageFundraisingForAthlete(admin, user.id, athleteId)
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  const videoPath = fundraisingVideoObjectPath(athleteId, ext)
  const { data: videoSigned, error: videoSignedErr } = await admin.storage
    .from(FUNDRAISING_VIDEOS_BUCKET)
    .createSignedUploadUrl(videoPath, { upsert: true })

  if (videoSignedErr || !videoSigned?.token || !videoSigned.path) {
    console.error("[fundraising-athlete-video-signed] video", videoSignedErr?.message)
    return NextResponse.json({ error: videoSignedErr?.message || "Could not start upload" }, { status: 500 })
  }

  let thumbnail: { path: string; token: string } | null = null
  if (hasThumbnail) {
    const thumbPath = fundraisingVideoThumbnailPath(athleteId)
    const { data: thumbSigned, error: thumbSignedErr } = await admin.storage
      .from(FUNDRAISING_VIDEOS_BUCKET)
      .createSignedUploadUrl(thumbPath, { upsert: true })
    if (thumbSignedErr || !thumbSigned?.token || !thumbSigned.path) {
      console.error("[fundraising-athlete-video-signed] thumb", thumbSignedErr?.message)
      return NextResponse.json({ error: thumbSignedErr?.message || "Could not start thumbnail upload" }, { status: 500 })
    }
    thumbnail = { path: thumbSigned.path, token: thumbSigned.token }
  }

  return NextResponse.json({
    bucket: FUNDRAISING_VIDEOS_BUCKET,
    video: { path: videoSigned.path, token: videoSigned.token },
    videoContentType: mime || "video/mp4",
    thumbnail,
  })
}
