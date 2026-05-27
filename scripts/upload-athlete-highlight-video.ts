/**
 * Upload a highlight video to Vercel Blob and set athletes.highlight_video_url.
 *
 * Usage:
 *   npm run athlete:upload-highlight -- --athlete "Jekai Sedgwick" --file "/path/to/reel.mov"
 *   npm run athlete:upload-highlight -- --athlete-id UUID --file "/path/to/reel.mp4" --dry-run
 *
 * Requires .env.local: BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import { put } from "@vercel/blob"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const dryRun = process.argv.includes("--dry-run")
const athleteName = arg("--athlete")
const athleteId = arg("--athlete-id")
const filePath = arg("--file")

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "mp4":
      return "video/mp4"
    case "webm":
      return "video/webm"
    case "mov":
      return "video/quicktime"
    default:
      return "application/octet-stream"
  }
}

async function main() {
  if (!filePath || (!athleteName && !athleteId)) {
    console.error(`
Usage:
  npm run athlete:upload-highlight -- --athlete "First Last" --file "/path/to/reel.mov"
  npm run athlete:upload-highlight -- --athlete-id UUID --file "/path/to/reel.mp4"
`)
    process.exit(1)
  }

  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`)
    process.exit(1)
  }

  const ext = path.extname(resolved).replace(/^\./, "") || "mp4"
  const blobName = `athlete/${slugify(athleteName ?? athleteId ?? "highlight")}-highlight-reel.${ext}`

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!dryRun && (!supabaseUrl || !supabaseKey)) {
    console.error("Missing Supabase credentials in .env.local")
    process.exit(1)
  }
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Missing BLOB_READ_WRITE_TOKEN in .env.local")
    process.exit(1)
  }

  const admin = dryRun ? null : createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: false } })

  let targetId = athleteId
  let targetName = athleteName

  if (!targetId && admin) {
    const { data, error } = await admin.from("athletes").select("id, name").ilike("name", `%${athleteName}%`).limit(5)
    if (error) throw new Error(error.message)
    const exact = (data ?? []).find((r) => r.name?.toLowerCase() === athleteName!.toLowerCase())
    const row = exact ?? data?.[0]
    if (!row?.id) {
      console.error(`No athlete found matching "${athleteName}"`)
      process.exit(1)
    }
    targetId = row.id
    targetName = row.name
  }

  const stat = fs.statSync(resolved)
  console.log(`Athlete: ${targetName ?? targetId}`)
  console.log(`File: ${resolved} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`Blob path: ${blobName}`)

  if (dryRun) {
    console.log("[dry-run] would upload and update highlight_video_url")
    return
  }

  const buffer = fs.readFileSync(resolved)
  const blob = await put(blobName, buffer, {
    access: "public",
    contentType: contentTypeForExt(ext),
    allowOverwrite: true,
  })

  console.log(`Uploaded: ${blob.url}`)

  const { error: updateErr } = await admin!
    .from("athletes")
    .update({ highlight_video_url: blob.url, updated_at: new Date().toISOString() })
    .eq("id", targetId!)

  if (updateErr) throw new Error(updateErr.message)

  console.log(`Updated athletes.highlight_video_url for ${targetName} (${targetId})`)
  console.log(`Profile: /view-profile?id=${targetId}`)
}

main().catch((err) => {
  console.error("[RecruitNC] upload-athlete-highlight-video:", err)
  process.exit(1)
})
