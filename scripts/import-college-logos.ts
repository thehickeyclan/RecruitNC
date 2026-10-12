#!/usr/bin/env npx tsx
/**
 * Load a folder of college logos into logo_mappings (and Vercel Blob), one school at a time.
 *
 *   npx tsx scripts/import-college-logos.ts <dir> <names.json>            # dry run: prints the plan
 *   npx tsx scripts/import-college-logos.ts <dir> <names.json> --write
 *
 * <dir>/logos/*.png are the pictures. <names.json> maps each file to the names it is filed under,
 * e.g. { "penn-state.png": ["Penn State", "Pennsylvania State University"] }. Names are written by
 * hand, with "College" or "University" spelled out, because the matcher reads "Cornell" as either
 * Cornell (lib/entity-logo-resolve.ts).
 *
 * Rules, all of them there because a coach was once greeted with another school's logo:
 *  - A school that already has a logo on file keeps it; only its missing names are added.
 *  - Nothing is written if any two names that count as the same school would end up with two
 *    different pictures. The run prints the clashes and stops.
 *  - Look at every picture against its name BEFORE running with --write. This script cannot.
 */
import fs from "fs"
import path from "path"
import { createRequire } from "module"

const req = createRequire(import.meta.url)
const rm = req("react") as { cache?: <T>(f: T) => T }
if (typeof rm.cache !== "function") rm.cache = (f) => f
const soPath = req.resolve("server-only")
;(req as unknown as { cache: Record<string, unknown> }).cache[soPath] = { id: soPath, filename: soPath, loaded: true, exports: {}, children: [], paths: [] }
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

async function main() {
  const [dir, namesFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"))
  const write = process.argv.includes("--write")
  if (!dir || !namesFile) throw new Error("usage: import-college-logos.ts <dir> <names.json> [--write]")
  const names = JSON.parse(fs.readFileSync(namesFile, "utf8")) as Record<string, string[]>

  const { createClient } = await import("@supabase/supabase-js")
  const { sameSchoolName } = await import("../lib/entity-logo-resolve")
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: existing, error } = await sb.from("logo_mappings").select("entity_name, logo_url").eq("entity_type", "college")
  if (error) throw new Error(error.message)
  const rows = (existing ?? []).map((r) => ({ name: String(r.entity_name).trim(), url: String(r.logo_url) }))
  const exact = (n: string) => rows.find((r) => r.name.toLowerCase() === n.toLowerCase())

  type Plan = { file: string; names: string[]; reuse: string | null; add: string[] }
  const plans: Plan[] = []
  for (const [file, list] of Object.entries(names)) {
    if (!fs.existsSync(path.join(dir, "logos", file))) throw new Error(`missing file ${file}`)
    const onFile = rows.filter((r) => list.some((n) => r.name.toLowerCase() === n.toLowerCase() || sameSchoolName(r.name, n)))
    const urls = [...new Set(onFile.map((r) => r.url))]
    if (urls.length > 1) throw new Error(`${file}: names already on file point at ${urls.length} different pictures: ${onFile.map((r) => r.name).join(", ")}`)
    plans.push({ file, names: list, reuse: urls[0] ?? null, add: list.filter((n) => !exact(n)) })
  }

  // After the load, no two names that read as the same school may show different pictures.
  const after = [...rows.map((r) => ({ name: r.name, pic: r.url })), ...plans.flatMap((p) => p.add.map((n) => ({ name: n, pic: p.reuse ?? `new:${p.file}` })))]
  const clashes: string[] = []
  for (let i = 0; i < after.length; i++)
    for (let j = i + 1; j < after.length; j++)
      if (after[i].pic !== after[j].pic && (after[i].name.toLowerCase() === after[j].name.toLowerCase() || sameSchoolName(after[i].name, after[j].name)))
        clashes.push(`"${after[i].name}" and "${after[j].name}"`)

  const fresh = plans.filter((p) => !p.reuse)
  console.log(`${plans.length} schools: ${fresh.length} new pictures, ${plans.length - fresh.length} already have one (kept); ${plans.reduce((n, p) => n + p.add.length, 0)} names to add`)
  for (const p of plans) console.log(`${p.reuse ? "keep" : "NEW "}  ${p.file.padEnd(28)} + ${p.add.join(" | ") || "(nothing to add)"}`)
  if (clashes.length) {
    console.log(`\nSTOPPED: ${clashes.length} pairs would be one school with two pictures:\n  ${clashes.join("\n  ")}`)
    process.exit(1)
  }
  if (!write) return console.log("\nDry run. Nothing written. Add --write once every picture has been looked at.")

  const { put } = await import("@vercel/blob")
  let added = 0
  for (const p of plans) {
    let url = p.reuse
    if (!url) {
      const blob = await put(`logos/college/${p.file}`, fs.readFileSync(path.join(dir, "logos", p.file)), { access: "public", contentType: "image/png", addRandomSuffix: true })
      url = blob.url
    }
    if (!p.add.length) continue
    const { error: insertError } = await sb.from("logo_mappings").insert(p.add.map((n) => ({ entity_type: "college", entity_name: n, logo_url: url })))
    if (insertError) throw new Error(`${p.file}: ${insertError.message}`)
    added += p.add.length
  }
  console.log(`\nWrote ${added} names.`)
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
