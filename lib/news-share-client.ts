import {
  newsShareImageApiPath,
  newsShareImageFilename,
  type NewsShareFormatId,
} from "@/lib/news-share-formats"

export type ShareNewsImageResult =
  | { mode: "native"; format: NewsShareFormatId }
  | { mode: "download"; format: NewsShareFormatId; filename: string }

export async function fetchNewsShareImageBlob(
  slug: string,
  format: NewsShareFormatId,
  origin?: string,
): Promise<Blob> {
  const path = newsShareImageApiPath(slug, format)
  const url =
    origin && typeof origin === "string"
      ? `${origin.replace(/\/$/, "")}${path}`
      : path
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Share image failed (${res.status})`)
  }
  return res.blob()
}

export function canShareNewsImageFile(file: File): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false
  if (!navigator.canShare) return true
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** Share generated PNG via native sheet, or download + return for link copy fallback. */
export async function shareNewsImageFile(opts: {
  slug: string
  format: NewsShareFormatId
  title: string
  shareUrl: string
  origin?: string
}): Promise<ShareNewsImageResult> {
  const { slug, format, title, shareUrl, origin } = opts
  const blob = await fetchNewsShareImageBlob(slug, format, origin)
  const filename = newsShareImageFilename(slug, format)
  const file = new File([blob], filename, { type: "image/png" })

  if (canShareNewsImageFile(file)) {
    await navigator.share({
      files: [file],
      title,
      text: `${title}\n\n${shareUrl}`,
    })
    return { mode: "native", format }
  }

  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  return { mode: "download", format, filename }
}

export function shareResultMessage(
  result: ShareNewsImageResult,
  linkCopied: boolean,
): { title: string; description: string } {
  if (result.mode === "native") {
    if (result.format === "ig-story") {
      return {
        title: "Image ready",
        description: "Choose Instagram → Story in the share menu.",
      }
    }
    if (result.format === "ig-square" || result.format === "ig-portrait") {
      return {
        title: "Image ready",
        description: "Choose Instagram in the share menu to create a post.",
      }
    }
    return {
      title: "Image ready",
      description: "Pick Facebook or another app in the share menu.",
    }
  }

  const linkNote = linkCopied ? " Article link copied too." : ""
  if (result.format === "ig-story") {
    return {
      title: "Image saved",
      description: `Open Instagram → Story → pick the saved image, then paste the link.${linkNote}`,
    }
  }
  if (result.format === "ig-square" || result.format === "ig-portrait") {
    return {
      title: "Image saved",
      description: `Open Instagram and create a post with the saved image.${linkNote}`,
    }
  }
  return {
    title: "Image saved",
    description: `Upload the image to Facebook and paste the article link.${linkNote}`,
  }
}
