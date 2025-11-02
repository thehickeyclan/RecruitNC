import { put, del, list } from "@vercel/blob"
import { nanoid } from "nanoid"

export type ImageCategory = "athlete" | "highschool" | "college" | "club"

/**
 * Upload an image to Vercel Blob storage
 * @param file The file to upload
 * @param category The category of the image (athlete, highschool, college, club)
 * @param name Optional name to use in the filename
 * @returns The URL of the uploaded image
 */
export async function uploadImage(file: File | Blob, category: ImageCategory, name?: string): Promise<string> {
  try {
    // Create a sanitized filename
    const sanitizedName = name ? name.toLowerCase().replace(/[^a-z0-9]/g, "-") : nanoid(8)
    const filename = `${category}/${sanitizedName}-${Date.now()}.${getExtensionFromMimeType(file.type)}`

    // Upload to Vercel Blob
    const { url } = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    })

    return url
  } catch (error) {
    console.error("Error uploading image:", error)
    throw new Error("Failed to upload image")
  }
}

/**
 * Delete an image from Vercel Blob storage
 * @param url The URL of the image to delete
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.error("Error deleting image:", error)
    throw new Error("Failed to delete image")
  }
}

/**
 * List all images in a specific category
 * @param category The category to list images from
 * @returns Array of blob objects
 */
export async function listImages(category: ImageCategory) {
  try {
    const { blobs } = await list({ prefix: `${category}/` })
    return blobs
  } catch (error) {
    console.error("Error listing images from Blob storage:", error)
    throw new Error("Failed to list images")
  }
}

/**
 * Convert a data URL to a Blob
 * @param dataUrl The data URL to convert
 * @returns A Blob object
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new Blob([u8arr], { type: mime })
}

/**
 * Get file extension from MIME type
 * @param mimeType The MIME type
 * @returns The file extension
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  }

  return extensions[mimeType] || "jpg"
}

/**
 * Check if an image exists
 * @param url The URL of the image to check
 * @returns Boolean indicating if the image exists
 */
export async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Convert a data URL to a File
 * @param dataUrl The data URL to convert
 * @param filename The filename to use
 * @returns A File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}
