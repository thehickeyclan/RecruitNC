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

/**
 * DB rows sometimes store Supabase object paths as site-relative `/storage/v1/...`, which 404 on the app origin.
 * Prefix with `NEXT_PUBLIC_SUPABASE_URL` when present (matches browser expectations for public buckets).
 */
export function absolutePublicAthleteImageUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith("data:")) return t
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "")
  if (!base) return t
  if (t.startsWith("/storage/")) return `${base}${t}`
  if (t.startsWith("storage/v1/")) return `${base}/${t}`
  return t
}

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
    "profile_photo_url",
    "profilePhotoUrl",
    "profile_picture_url",
    "picture_url",
    "pictureUrl",
    "avatar_url",
    "avatarUrl",
    "image_url",
    "imageUrl",
    "headshot_url",
    "headshotUrl",
    "athlete_image",
    "hero_image_url",
    "commitmentphotourl",
    "commitmentPhotoUrl",
    "commitment_photo_url",
  ] as const

  for (const k of keys) {
    const v = row[k]
    if (typeof v !== "string") continue
    const t = v.trim()
    if (!t || skip.has(t)) continue
    return absolutePublicAthleteImageUrl(t)
  }
  return null
}
