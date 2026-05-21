import * as fal from "@fal-ai/serverless-client"
import { put } from "@vercel/blob"

fal.config({
  credentials: process.env.FAL_KEY,
})

/** Remove background via fal BiRefNet (same as store `/api/remove-background`). */
export async function removeBackgroundFromImageUrl(imageUrl: string): Promise<string> {
  const result = await fal.subscribe("fal-ai/birefnet", {
    input: { image_url: imageUrl },
  })
  const outputUrl = (result as { image?: { url?: string } }).image?.url
  if (!outputUrl) throw new Error("No image returned from background removal")
  return outputUrl
}

/** Upload bytes to Blob (public) so fal can fetch the source. */
export async function uploadGearBytesToBlob(
  path: string,
  data: Buffer | Uint8Array,
  contentType = "image/png"
): Promise<string> {
  const blob = await put(path, data, { access: "public", contentType })
  return blob.url
}

export async function removeBackgroundFromBytes(
  filename: string,
  data: Buffer
): Promise<{ transparentUrl: string; buffer: Buffer }> {
  const tempUrl = await uploadGearBytesToBlob(
    `nhsca-gear/_processing/${Date.now()}-${filename}`,
    data
  )
  const transparentUrl = await removeBackgroundFromImageUrl(tempUrl)
  const res = await fetch(transparentUrl)
  if (!res.ok) throw new Error(`Failed to download processed image (${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { transparentUrl, buffer }
}
