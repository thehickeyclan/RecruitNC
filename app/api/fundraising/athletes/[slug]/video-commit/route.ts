import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import {
  normalizeFundraisingProfileSlug,
  resolveFundraisingAthletePublic,
} from "@/lib/fundraising/athlete-fundraising-profiles"
import { fundraisingVideoThumbnailPath, removeFundraisingStoragePaths } from "@/lib/fundraising/fundraising-video-storage"

const VIDEO_PATH_RE = /^athlete\/([^/]+)\/fundraising\.(mp4|webm|mov)$/i

type Body = { videoPath?: string; thumbnailPath?: string | null }

function pathsAllowedForAthlete(athleteId: string, videoPath: string, thumbnailPath: string | null): boolean {
  const id = athleteId.trim()
  const vm = VIDEO_PATH_RE.exec(videoPath.trim())
  if (!vm || vm[1] !== id) return false
  if (thumbnailPath === null) return true
  return thumbnailPath.trim() === fundraisingVideoThumbnailPath(id)
}

/**
 * Persist fundraising video paths after direct-to-Supabase upload (see video-signed).
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

  const videoPath = typeof body.videoPath === "string" ? body.videoPath.trim() : ""
  if (!videoPath) {
    return NextResponse.json({ error: "Missing videoPath" }, { status: 400 })
  }

  const thumbRaw = body.thumbnailPath
  const thumbnailPath: string | null = thumbRaw === null || thumbRaw === undefined ? null : String(thumbRaw).trim() || null

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

  if (!pathsAllowedForAthlete(athleteId, videoPath, thumbnailPath)) {
    return NextResponse.json({ error: "Invalid paths" }, { status: 400 })
  }

  const oldVideoPath = profile.fundraising_video_url?.trim() || null
  const oldThumbPath = profile.fundraising_video_thumbnail_url?.trim() || null

  const thumbPathToStore: string | null = thumbnailPath

  if (!thumbPathToStore && oldThumbPath) {
    await removeFundraisingStoragePaths(admin, [oldThumbPath])
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    fundraising_video_url: videoPath,
    fundraising_video_thumbnail_url: thumbPathToStore,
  }

  const { error: dbErr } = await admin.from("athlete_fundraising_profiles").update(patch).eq("id", profile.id)
  if (dbErr) {
    console.error("[fundraising-athlete-video-commit] profile", dbErr.message)
    return NextResponse.json({ error: "Could not save video to profile" }, { status: 500 })
  }

  const toRemove: string[] = []
  if (oldVideoPath && oldVideoPath !== videoPath) toRemove.push(oldVideoPath)
  if (oldThumbPath && thumbPathToStore && oldThumbPath !== thumbPathToStore) toRemove.push(oldThumbPath)
  if (toRemove.length) await removeFundraisingStoragePaths(admin, toRemove)

  return NextResponse.json({
    ok: true,
    fundraising_video_url: videoPath,
    fundraising_video_thumbnail_url: thumbPathToStore,
  })
}
