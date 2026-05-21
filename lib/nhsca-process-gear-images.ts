import fs from "fs"
import path from "path"
import { put } from "@vercel/blob"
import {
  NHSCA_DUALS_2026_ALL_GEAR_PHOTOS,
  NHSCA_GEAR_PUBLIC_FILE_BY_ID,
} from "@/lib/nhsca-duals-2026-gear-images"
import { removeBackgroundFromBytes, removeBackgroundFromImageUrl } from "@/lib/nhsca-gear-background-removal"

export type ProcessGearImageResult = {
  id: string
  label: string
  status: "success" | "error"
  message?: string
  localPath?: string
  savedLocal?: boolean
  blobUrl?: string
}

function publicGearPath(relativeSrc: string): string {
  return path.join(process.cwd(), "public", relativeSrc.replace(/^\//, ""))
}

export async function processNhscaGearImage(
  id: string,
  opts?: { appBaseUrl?: string }
): Promise<ProcessGearImageResult> {
  const photo = NHSCA_DUALS_2026_ALL_GEAR_PHOTOS.find((p) => p.id === id)
  if (!photo) {
    return { id, label: id, status: "error", message: "Unknown gear id" }
  }

  const filename = NHSCA_GEAR_PUBLIC_FILE_BY_ID[id]
  if (!filename) {
    return { id, label: photo.label, status: "error", message: "No public file mapping" }
  }

  const relativeSrc = `/images/nhsca-duals-2026-gear/${filename}`
  const localPath = publicGearPath(relativeSrc)

  try {
    if (!process.env.FAL_KEY) {
      throw new Error("FAL_KEY is not configured")
    }

    let transparentUrl: string
    let buffer: Buffer

    if (fs.existsSync(localPath)) {
      const source = fs.readFileSync(localPath)
      const processed = await removeBackgroundFromBytes(filename, source)
      transparentUrl = processed.transparentUrl
      buffer = processed.buffer
    } else if (opts?.appBaseUrl) {
      const sourceUrl = `${opts.appBaseUrl.replace(/\/$/, "")}${relativeSrc}`
      transparentUrl = await removeBackgroundFromImageUrl(sourceUrl)
      const res = await fetch(transparentUrl)
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      buffer = Buffer.from(await res.arrayBuffer())
    } else {
      throw new Error(`Local file not found: ${relativeSrc}`)
    }

    const blob = await put(`nhsca-duals-2026-gear/${id}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      allowOverwrite: true,
    })

    let savedLocal = false
    try {
      fs.mkdirSync(path.dirname(localPath), { recursive: true })
      fs.writeFileSync(localPath, buffer)
      savedLocal = true
    } catch {
      // Expected on Vercel — Blob URL still works via manifest
    }

    return {
      id,
      label: photo.label,
      status: "success",
      message: savedLocal ? "Saved transparent PNG locally and to Blob" : "Saved to Blob (commit locally or copy URL)",
      localPath: relativeSrc,
      savedLocal,
      blobUrl: blob.url,
    }
  } catch (err) {
    return {
      id,
      label: photo.label,
      status: "error",
      message: err instanceof Error ? err.message : "Processing failed",
      localPath: relativeSrc,
    }
  }
}

export async function processAllNhscaGearImages(opts?: {
  appBaseUrl?: string
  ids?: string[]
}): Promise<ProcessGearImageResult[]> {
  const ids = opts?.ids?.length
    ? opts.ids
    : NHSCA_DUALS_2026_ALL_GEAR_PHOTOS.map((p) => p.id)
  const results: ProcessGearImageResult[] = []
  for (const id of ids) {
    results.push(await processNhscaGearImage(id, opts))
  }
  return results
}

/** Build manifest JSON to paste into lib/nhsca-gear-processed-manifest.json */
export function manifestFromResults(results: ProcessGearImageResult[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of results) {
    if (r.status === "success" && r.blobUrl) out[r.id] = r.blobUrl
  }
  return out
}
