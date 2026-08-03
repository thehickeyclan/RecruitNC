import { put } from "@vercel/blob"
import { createReadStream, readdirSync, statSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const VIDEO_ROOT = path.join(ROOT, "public", "national-team")

function collectMovFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectMovFiles(fullPath)
    return entry.isFile() && entry.name.toLowerCase().endsWith(".mov") ? [fullPath] : []
  })
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN")
  }

  const files = collectMovFiles(VIDEO_ROOT).sort()
  const mappings: Record<string, string> = {}

  for (const [index, filePath] of files.entries()) {
    const publicPath = `/${path.relative(path.join(ROOT, "public"), filePath).split(path.sep).join("/")}`
    const blobPath = publicPath.slice(1)
    const megabytes = (statSync(filePath).size / 1024 / 1024).toFixed(1)
    process.stderr.write(`[${index + 1}/${files.length}] Uploading ${publicPath} (${megabytes} MB)\n`)

    let blob: Awaited<ReturnType<typeof put>> | undefined
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        blob = await put(blobPath, createReadStream(filePath), {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "video/quicktime",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
        break
      } catch (error) {
        if (attempt === 4) throw error
        process.stderr.write(`  Retry ${attempt}/3 after upload error\n`)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500))
      }
    }

    if (!blob) throw new Error(`Upload did not return a URL for ${publicPath}`)

    mappings[publicPath] = blob.url
  }

  process.stdout.write(`${JSON.stringify(mappings, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
