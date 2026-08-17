import fs from "fs"; import path from "path"; import { createRequire } from "module"; import { fileURLToPath } from "url"
const req = createRequire(import.meta.url)
const rm = req("react") as { cache?: <T>(f: T) => T }; if (typeof rm.cache !== "function") rm.cache = (f) => f
// public-announced-field imports "server-only", which throws outside an RSC render; pre-seed the module
// cache so this script can exercise the real code path.
const soPath = req.resolve("server-only")
;(req as unknown as { cache: Record<string, unknown> }).cache[soPath] = { id: soPath, filename: soPath, loaded: true, exports: {}, children: [], paths: [] }
const nc = req("next/cache") as { unstable_cache?: (f: unknown) => unknown }; nc.unstable_cache = (f) => f
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
for (const rel of [".env.local", ".env"]) { const p = path.join(root, rel); if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) { const t = line.trim(); if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("="); if (eq <= 0) continue; const k = t.slice(0, eq).trim(); let v = t.slice(eq+1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1)
    if (!process.env[k]) process.env[k] = v.replace(/\r$/, "").trim() } }
const main = async () => {
  const { createAdminClient } = await import("../lib/supabase/admin")
  const admin = createAdminClient()
  const probe = await admin.from("toc_field_publication_status").select("weight_class, athlete_field_locked, announced_at").limit(20)
  console.log("=== migration applied? ===")
  if (probe.error) { console.log("NOT YET:", probe.error.message); }
  else console.log("YES — announced_at readable. rows:", JSON.stringify(probe.data))

  const { listPublicWeightTiles, getPublicAnnouncedWeight } = await import("../lib/toc/public-announced-field")
  const tiles = await listPublicWeightTiles()
  console.log("\n=== public hub tiles (live data) ===")
  for (const t of tiles) console.log(`  ${String(t.weightClass).padStart(3)}  announced=${t.announced}  count=${t.athleteCount}  ${t.announcedAt ?? ""}`)
  console.log("\n=== per-weight gate check ===")
  for (const w of [117, 125, 133]) {
    const f = await getPublicAnnouncedWeight(w)
    console.log(`  ${w}: ${f ? `PUBLIC (${f.athletes.length} athletes)` : "404 / not released"}`)
    if (f) for (const a of f.athletes) console.log(`      ${a.name} · ${a.graduationYear ?? "—"} · ${a.club ?? "no club"} · photo=${a.photoUrl ? "yes" : "none"} · commit=${a.collegeCommit ?? "—"} · results=[${a.results.join(" | ")}]`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
