/**
 * Small photo thumbnails for a coach report's data file, so the page and its PDF do not carry
 * every wrestler's full-size profile photo (some are over 1 MB; 87 of them made "Download PDF"
 * crawl, Matt 26 Oct 2026). Image optimization is off site-wide, so they are made here once:
 * 192px square JPEGs in Blob at reports/thumbs/<athleteId>.jpg, and the file's `photos` map is
 * rewritten to point at them. Re-run after rebuilding the report.
 *
 *   npx tsx --env-file=.env.local scripts/coach-report-thumbs.ts content/reports/super32-2026.json
 */
import fs from "node:fs"
import sharp from "sharp"
import { put } from "@vercel/blob"

async function main() {
  const file = process.argv[2]
  if (!file) throw new Error("usage: coach-report-thumbs.ts <report.json>")
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { photos: Record<string, string> }
  let made = 0, kept = 0
  for (const [id, url] of Object.entries(data.photos)) {
    if (url.includes("/reports/thumbs/")) { kept++; continue }
    const res = await fetch(url)
    if (!res.ok) { console.warn(`skip ${id}: ${res.status}`); continue }
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(192, 192, { fit: "cover", position: "top" }).jpeg({ quality: 72 }).toBuffer()
    const blob = await put(`reports/thumbs/${id}.jpg`, jpg, { access: "public", contentType: "image/jpeg", addRandomSuffix: false, allowOverwrite: true })
    data.photos[id] = blob.url
    made++
  }
  fs.writeFileSync(file, JSON.stringify(data))
  console.log(`thumbnails made ${made}, already thumbnails ${kept}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
