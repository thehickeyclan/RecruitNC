/**
 * Step 2 check: every athlete's tournament bundle loaded by name and by stored link, compared in
 * full. Read-only. Prints which athletes differ and how, plus the time each mode took.
 */
import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"
import { loadAthleteTournamentBundle } from "../../lib/athlete-tournament-bundle"

const key = (fam: string, r: any) =>
  `${fam}|${r.year}|${String(r.weight ?? r.weight_class ?? "").match(/\d{2,3}/)?.[0] ?? "?"}|${r.placement ?? r.place ?? ""}|${r.record ?? ""}`

function keys(b: any): Set<string> {
  return new Set([
    ...b.nchsaa.map((r: any) => key("NCHSAA", r)),
    ...b.nhsca.map((r: any) => key("NHSCA", r)),
    ...b.super32.map((r: any) => key("Super 32", r)),
    ...b.fargo.map((r: any) => key("Fargo", r)),
    ...b.other.map((r: any) => key("Other", r)),
  ])
}

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: athletes } = await admin.from("athletes").select("*")
  const out: any[] = []
  let nameMs = 0, linkMs = 0, i = 0
  async function work() {
    while (i < athletes!.length) {
      const a = athletes![i++]
      let t = Date.now()
      const byName = await loadAthleteTournamentBundle(admin as any, a, { linkedRead: false })
      nameMs += Date.now() - t
      t = Date.now()
      const byLink = await loadAthleteTournamentBundle(admin as any, a, { linkedRead: true })
      linkMs += Date.now() - t
      const kn = keys(byName), kl = keys(byLink)
      const lost = [...kn].filter((k) => !kl.has(k)), gained = [...kl].filter((k) => !kn.has(k))
      out.push({ id: a.id, name: a.name, cls: a.graduationyear, lost, gained })
    }
  }
  await Promise.all(Array.from({ length: 4 }, work))
  const differ = out.filter((r) => r.lost.length || r.gained.length)
  console.log(`athletes ${out.length} | identical ${out.length - differ.length} | differ ${differ.length}`)
  console.log(`time: by name ${(nameMs / 1000).toFixed(0)}s, by link ${(linkMs / 1000).toFixed(0)}s`)
  writeFileSync(process.env.OUT ?? "/tmp/bundle-modes.json", JSON.stringify(differ))
}
main().catch((e) => { console.error(e); process.exit(1) })
