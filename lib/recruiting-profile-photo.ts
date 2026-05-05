/**
 * Single source for “which URL do we show on recruiting surfaces” — matches
 * `getAthletePhoto` in `components/athlete-detail.tsx` (view-profile): photourl first,
 * then photo_url, then image_url, then optional headshot_url / athlete_image.
 */

const DEFAULT_PLACEHOLDER_PATHS = new Set<string>([
  "/wrestler-silhouette.png",
  "/diverse-wrestlers.png",
  "/placeholder.svg",
])

export function recruitingProfilePhotoFromRow(
  row: Record<string, unknown> | null | undefined,
  extraPlaceholders?: Set<string>,
): string | null {
  if (!row) return null
  const skip = extraPlaceholders
    ? new Set([...DEFAULT_PLACEHOLDER_PATHS, ...extraPlaceholders])
    : DEFAULT_PLACEHOLDER_PATHS

  const keys = [
    "photourl",
    "photoUrl",
    "photo_url",
    "image_url",
    "imageUrl",
    "headshot_url",
    "headshotUrl",
    "athlete_image",
  ] as const

  for (const k of keys) {
    const v = row[k]
    if (typeof v !== "string") continue
    const t = v.trim()
    if (!t || skip.has(t)) continue
    return t
  }
  return null
}
