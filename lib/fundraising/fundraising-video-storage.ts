import type { SupabaseClient } from "@supabase/supabase-js"

/** Private bucket — use signed URLs for playback and donor links. */
export const FUNDRAISING_VIDEOS_BUCKET = "fundraising-videos"

/** Seconds — public gift page video (refreshed each page load). */
export const FUNDRAISING_VIDEO_SIGNED_URL_TTL = 60 * 60

const VIDEO_EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
}

export function extensionForVideoMime(mime: string): string | null {
  const m = mime.toLowerCase().split(";")[0]!.trim()
  return VIDEO_EXT_BY_MIME[m] ?? null
}

export function fundraisingVideoObjectPath(athleteId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "mp4"
  return `athlete/${athleteId.trim()}/fundraising.${safeExt}`
}

export function fundraisingVideoThumbnailPath(athleteId: string): string {
  return `athlete/${athleteId.trim()}/fundraising-thumb.jpg`
}

export async function createFundraisingVideoSignedUrl(
  admin: SupabaseClient,
  objectPath: string | null | undefined,
  ttlSeconds: number,
): Promise<string | null> {
  const p = (objectPath ?? "").trim()
  if (!p) return null
  const { data, error } = await admin.storage.from(FUNDRAISING_VIDEOS_BUCKET).createSignedUrl(p, ttlSeconds)
  if (error) {
    console.warn("[fundraising-video-storage] signed URL", error.message)
    return null
  }
  return data?.signedUrl ?? null
}

export async function removeFundraisingStoragePaths(admin: SupabaseClient, paths: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(paths.map((p) => (p ?? "").trim()).filter(Boolean))]
  if (unique.length === 0) return
  const { error } = await admin.storage.from(FUNDRAISING_VIDEOS_BUCKET).remove(unique)
  if (error) {
    console.warn("[fundraising-video-storage] remove", error.message)
  }
}
