import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { userCanManageFundraisingForAthlete, userIsRecruitNcAdmin } from "@/lib/fundraising/athlete-fundraising-access"
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
  removeFundraisingStoragePaths,
} from "@/lib/fundraising/fundraising-video-storage"

const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const MAX_THUMB_BYTES = 5 * 1024 * 1024

type Kind = "fundraising" | "thankyou"

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

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 })
  }

  const kindRaw = form.get("kind")
  const kind: Kind = kindRaw === "thankyou" ? "thankyou" : "fundraising"

  const videoFile = form.get("video")
  if (!(videoFile instanceof File) || videoFile.size < 1) {
    return NextResponse.json({ error: "Missing video file" }, { status: 400 })
  }
  if (videoFile.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Video must be 100MB or smaller" }, { status: 400 })
  }

  const mime = (videoFile.type || "application/octet-stream").split(";")[0]!.trim().toLowerCase()
  const ext = extensionForVideoMime(mime)
  if (!ext) {
    return NextResponse.json({ error: "Use MP4, WebM, or MOV (QuickTime)." }, { status: 400 })
  }

  const thumbField = form.get("thumbnail")
  const thumbFile = thumbField instanceof File && thumbField.size > 0 ? thumbField : null
  if (thumbFile && thumbFile.size > MAX_THUMB_BYTES) {
    return NextResponse.json({ error: "Thumbnail must be 5MB or smaller" }, { status: 400 })
  }
  if (thumbFile && !thumbFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "Thumbnail must be an image" }, { status: 400 })
  }

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

  const isAdmin = await userIsRecruitNcAdmin(admin, user.id)
  const checkoutLive = profile.checkout_live === true
  if (!checkoutLive && !isAdmin) {
    return NextResponse.json(
      { error: "Videos can be managed after this gift page is activated for checkout." },
      { status: 403 },
    )
  }

  const videoPath = fundraisingVideoObjectPath(athleteId, ext, kind)
  const thumbPath = fundraisingVideoThumbnailPath(athleteId, kind)

  const oldVideoPath =
    kind === "fundraising" ? profile.fundraising_video_url?.trim() || null : profile.thankyou_video_url?.trim() || null
  const oldThumbPath =
    kind === "fundraising"
      ? profile.fundraising_video_thumbnail_url?.trim() || null
      : profile.thankyou_video_thumbnail_url?.trim() || null

  const videoBuf = Buffer.from(await videoFile.arrayBuffer())

  const { error: upVideoErr } = await admin.storage.from(FUNDRAISING_VIDEOS_BUCKET).upload(videoPath, videoBuf, {
    upsert: true,
    contentType: mime || "video/mp4",
  })
  if (upVideoErr) {
    console.error("[fundraising-athlete-video] upload video", upVideoErr.message)
    return NextResponse.json({ error: upVideoErr.message || "Upload failed" }, { status: 500 })
  }

  let thumbPathToStore: string | null = null
  if (thumbFile) {
    const tbuf = Buffer.from(await thumbFile.arrayBuffer())
    const tType = thumbFile.type?.includes("png") ? "image/png" : "image/jpeg"
    const { error: upThumbErr } = await admin.storage.from(FUNDRAISING_VIDEOS_BUCKET).upload(thumbPath, tbuf, {
      upsert: true,
      contentType: tType,
    })
    if (upThumbErr) {
      console.error("[fundraising-athlete-video] upload thumb", upThumbErr.message)
      await admin.storage.from(FUNDRAISING_VIDEOS_BUCKET).remove([videoPath])
      return NextResponse.json({ error: upThumbErr.message || "Thumbnail upload failed" }, { status: 500 })
    }
    thumbPathToStore = thumbPath
  } else {
    if (oldThumbPath) {
      await removeFundraisingStoragePaths(admin, [oldThumbPath])
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (kind === "fundraising") {
    patch.fundraising_video_url = videoPath
    patch.fundraising_video_thumbnail_url = thumbPathToStore
  } else {
    patch.thankyou_video_url = videoPath
    patch.thankyou_video_thumbnail_url = thumbPathToStore
  }

  const { error: dbErr } = await admin.from("athlete_fundraising_profiles").update(patch).eq("id", profile.id)
  if (dbErr) {
    console.error("[fundraising-athlete-video] profile", dbErr.message)
    await admin.storage.from(FUNDRAISING_VIDEOS_BUCKET).remove([videoPath, ...(thumbPathToStore ? [thumbPathToStore] : [])])
    return NextResponse.json({ error: "Could not save video to profile" }, { status: 500 })
  }

  const toRemove: string[] = []
  if (oldVideoPath && oldVideoPath !== videoPath) toRemove.push(oldVideoPath)
  if (oldThumbPath && thumbPathToStore && oldThumbPath !== thumbPathToStore) toRemove.push(oldThumbPath)
  if (toRemove.length) await removeFundraisingStoragePaths(admin, toRemove)

  return NextResponse.json({
    ok: true,
    fundraising_video_url: kind === "fundraising" ? videoPath : profile.fundraising_video_url,
    fundraising_video_thumbnail_url: kind === "fundraising" ? thumbPathToStore : profile.fundraising_video_thumbnail_url,
    thankyou_video_url: kind === "thankyou" ? videoPath : profile.thankyou_video_url,
    thankyou_video_thumbnail_url: kind === "thankyou" ? thumbPathToStore : profile.thankyou_video_thumbnail_url,
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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

  const u = new URL(request.url)
  const kind: Kind = u.searchParams.get("kind") === "thankyou" ? "thankyou" : "fundraising"

  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  const profile = resolved?.profile
  if (!profile?.id || !profile.athlete_id) {
    return NextResponse.json({ error: "Fundraising profile not found" }, { status: 404 })
  }

  const athleteId = profile.athlete_id
  const allowed = await userCanManageFundraisingForAthlete(admin, user.id, athleteId)
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  const isAdmin = await userIsRecruitNcAdmin(admin, user.id)
  const checkoutLive = profile.checkout_live === true
  if (!checkoutLive && !isAdmin) {
    return NextResponse.json(
      { error: "Videos can be managed after this gift page is activated for checkout." },
      { status: 403 },
    )
  }

  const videoPath = kind === "fundraising" ? profile.fundraising_video_url?.trim() : profile.thankyou_video_url?.trim()
  const thumbPath =
    kind === "fundraising"
      ? profile.fundraising_video_thumbnail_url?.trim()
      : profile.thankyou_video_thumbnail_url?.trim()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (kind === "fundraising") {
    patch.fundraising_video_url = null
    patch.fundraising_video_thumbnail_url = null
  } else {
    patch.thankyou_video_url = null
    patch.thankyou_video_thumbnail_url = null
  }

  const { error: dbErr } = await admin.from("athlete_fundraising_profiles").update(patch).eq("id", profile.id)
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  await removeFundraisingStoragePaths(admin, [videoPath, thumbPath])

  return NextResponse.json({ ok: true })
}
