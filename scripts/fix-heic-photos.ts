/**
 * Profile photos stored as HEIC, converted to JPEG.
 *
 * Safari shows a HEIC photo; Chrome, Edge and Android show a broken image. Uploads are converted in
 * the browser now (lib/images/prepare-photo.ts) - this repairs the ones that went up before (Cristal
 * Pena's, found in the mobile review, 30 Oct 2026). Uses macOS `sips`, so it runs on a Mac.
 *
 *   npx tsx --env-file=.env.local scripts/fix-heic-photos.ts           (lists them)
 *   npx tsx --env-file=.env.local scripts/fix-heic-photos.ts --write   (converts and repoints)
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { put } from "@vercel/blob"
import { createClient } from "@supabase/supabase-js"

const WRITE = process.argv.includes("--write")

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await s
    .from("athletes")
    .select('id,"firstName","lastName",photourl')
    .or("photourl.ilike.%.heic,photourl.ilike.%.heif")
    .order("id")
  if (error) throw error
  console.log(`${data.length} HEIC profile photo(s)`)
  const dir = mkdtempSync(join(tmpdir(), "heic-"))
  for (const a of data) {
    console.log(`- ${a.firstName} ${a.lastName} (${a.id})`)
    if (!WRITE) continue
    const res = await fetch(a.photourl)
    if (!res.ok) {
      console.log(`  skipped: photo answered ${res.status}`)
      continue
    }
    const src = join(dir, `${a.id}.heic`)
    const out = join(dir, `${a.id}.jpg`)
    writeFileSync(src, Buffer.from(await res.arrayBuffer()))
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", "-Z", "1600", src, "--out", out], { stdio: "ignore" })
    const name = String(a.photourl).split("/").pop()!.replace(/\.hei[cf]$/i, ".jpg")
    const blob = await put(`athletes/${a.id}/${name}`, readFileSync(out), { access: "public", contentType: "image/jpeg", addRandomSuffix: true })
    const { error: upd } = await s.from("athletes").update({ photourl: blob.url }).eq("id", a.id)
    console.log(upd ? `  update failed: ${upd.message}` : `  now ${blob.url}`)
  }
  if (!WRITE && data.length) console.log("\nRun again with --write to convert them.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
