/** Highlight reel URL helpers — YouTube embed vs direct video (Blob, mp4, etc.). */

export function getYouTubeVideoId(url: string): string | null {
  if (!url?.trim()) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /youtube\.com\/shorts\/([^&?/]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export function isDirectHighlightVideoUrl(url: string): boolean {
  if (!url?.trim()) return false
  if (getYouTubeVideoId(url)) return false
  const lower = url.toLowerCase()
  return (
    lower.includes("blob.vercel-storage.com") ||
    /\.(mp4|webm|mov)(\?|$)/i.test(url) ||
    lower.startsWith("/videos/") ||
    lower.startsWith("/uploads/")
  )
}
