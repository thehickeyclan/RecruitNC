/** NHSCA team hub — shared photo/video gallery for signed-in families. */

export const NHSCA_HUB_MEDIA_TABLE = "nhsca_hub_media"
export const NHSCA_HUB_MEDIA_EVENT_SLUG = "nhsca-duals-2026"

export const NHSCA_HUB_MEDIA_MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const NHSCA_HUB_MEDIA_MAX_VIDEO_BYTES = 80 * 1024 * 1024

export const NHSCA_HUB_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const

export const NHSCA_HUB_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const

export type NhscaHubMediaType = "image" | "video"

export type NhscaHubMediaRow = {
  id: string
  event_slug: string
  user_id: string
  uploader_email: string | null
  uploader_name: string | null
  media_type: NhscaHubMediaType
  url: string
  filename: string | null
  caption: string | null
  content_type: string | null
  created_at: string
}

export function nhscaHubMediaTypeFromMime(mime: string): NhscaHubMediaType | null {
  if ((NHSCA_HUB_IMAGE_TYPES as readonly string[]).includes(mime)) return "image"
  if ((NHSCA_HUB_VIDEO_TYPES as readonly string[]).includes(mime)) return "video"
  return null
}

export function isMissingNhscaHubMediaTableError(message?: string | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes("nhsca_hub_media") && (m.includes("does not exist") || m.includes("relation"))
}
