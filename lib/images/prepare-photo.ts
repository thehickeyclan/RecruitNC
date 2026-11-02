/**
 * A photo made ready for /api/athletes/upload-image, in the browser.
 *
 * An iPhone photo can arrive as HEIC, which Safari shows and Chrome, Edge and Android do not: Cristal
 * Pena's profile photo was stored as .heic and showed as a broken image to everyone off Safari
 * (mobile review, 30 Oct 2026). Every photo the browser can open is redrawn as a JPEG no wider or
 * taller than MAX_EDGE, which also brings a 12-megapixel phone photo under the upload limit. One the
 * browser cannot open is sent as it is when it is a format every browser shows, and refused when
 * it is HEIC.
 */

export const HEIC_MESSAGE =
  "That photo is in Apple's HEIC format, which most browsers can't show. Choose a JPG or PNG, or take a screenshot of the photo and upload that."

const MAX_EDGE = 1600
const PASS_THROUGH = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

export function isHeic(file: { type?: string; name?: string }): boolean {
  return /^image\/hei[cf]/i.test(file.type ?? "") || /\.hei[cf]$/i.test(file.name ?? "")
}

export async function preparePhoto(file: File): Promise<File> {
  // A small file in a format every browser shows is fine as it is; a GIF keeps its animation.
  if (file.type === "image/gif" || (PASS_THROUGH.has(file.type) && file.size <= 1_500_000)) return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    if (isHeic(file)) throw new Error(HEIC_MESSAGE)
    return file
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) return isHeic(file) ? Promise.reject(new Error(HEIC_MESSAGE)) : file
  // A transparent PNG would turn black as a JPEG.
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
  if (!blob) {
    if (isHeic(file)) throw new Error(HEIC_MESSAGE)
    return file
  }
  const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`
  return new File([blob], name, { type: "image/jpeg" })
}
