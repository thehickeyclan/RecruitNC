"use server"

import { put } from "@vercel/blob"
import { nanoid } from "nanoid"

export async function uploadToBlob(file: File): Promise<string> {
  try {
    const filename = `${nanoid()}-${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
    })

    return blob.url
  } catch (error) {
    console.error("Error uploading to blob:", error)
    throw new Error("Failed to upload image")
  }
}
