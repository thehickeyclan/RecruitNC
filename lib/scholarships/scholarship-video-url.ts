/** YouTube / Vimeo links for scholarship video nominations. */

const MAX_URL_LEN = 600

function isYouTubeOrVimeoHost(host: string): boolean {
  const h = host.toLowerCase()
  return (
    h === "youtu.be" ||
    h.endsWith(".youtube.com") ||
    h.endsWith("youtube-nocookie.com") ||
    h === "vimeo.com" ||
    h.endsWith(".vimeo.com")
  )
}

/** Accepts watch, shorts, youtu.be, vimeo.com/... */
export function parseScholarshipVideoPageUrl(raw: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const t = raw.trim()
  if (!t) return { ok: false, error: "Paste a YouTube or Vimeo link." }
  let u: URL
  try {
    u = new URL(t)
  } catch {
    return { ok: false, error: "That does not look like a valid URL." }
  }
  if (u.protocol !== "https:") {
    return { ok: false, error: "Use an https link only." }
  }
  if (!isYouTubeOrVimeoHost(u.hostname)) {
    return { ok: false, error: "Use YouTube or Vimeo (unlisted or public links are fine)." }
  }
  const normalized = u.toString().slice(0, MAX_URL_LEN)
  return { ok: true, normalized }
}

/** Vercel Blob public URLs from our client upload flow. */
export function parseScholarshipVideoBlobUrl(raw: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const t = raw.trim()
  if (!t) return { ok: false, error: "Upload a video file, or use a link instead." }
  let u: URL
  try {
    u = new URL(t)
  } catch {
    return { ok: false, error: "Upload did not return a valid URL — try again." }
  }
  if (u.protocol !== "https:") {
    return { ok: false, error: "Invalid upload URL." }
  }
  const h = u.hostname.toLowerCase()
  if (!h.endsWith(".blob.vercel-storage.com") && !h.endsWith(".public.blob.vercel-storage.com")) {
    return { ok: false, error: "Invalid file host — use the upload button on this form." }
  }
  const normalized = u.toString().slice(0, MAX_URL_LEN)
  return { ok: true, normalized }
}
