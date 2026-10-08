#!/usr/bin/env npx tsx
/**
 * Bouts linked to the wrong person. Run after every bout import.
 *
 * On 8 October 2026 a Nebraska boy's Fargo and Super 32 bouts sat on Parkwood's 145-pound Riley
 * Johnson, and the women's board credited her with beating two of Flo's ranked 190-pound boys.
 * Three importers linked any state's wrestler to an NC profile by name under --all-states. They are
 * fixed; this is the check that would have caught it, and will catch the next one:
 *
 * - a bout whose gender is not the athlete's, and
 * - a bout entered under another state's code ("NE", "OH") on an NC athlete's profile.
 *
 * A wrestler who really did move states is the rare exception; list her in REVIEWED with the
 * reason, after a person has looked. Nothing is changed unless --unlink is passed, and then only
 * the athlete_id is cleared: the bout stays, as the other wrestler's opponent record.
 *
 *   npx tsx scripts/audit-bout-links.ts             # report
 *   npx tsx scripts/audit-bout-links.ts --unlink    # clear the wrong links
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const UNLINK = process.argv.includes("--unlink")
const GENDER = process.argv.find((a) => a.startsWith("--gender="))?.split("=")[1] // limit to "Female" or "Male"

/** "athlete name|state": a person has confirmed this out-of-state entrant is our wrestler. */
const REVIEWED = new Set<string>([])

/** Waiting on a person's call (8 October 2026): rare names at the weight they wrestle here. Reported, never unlinked. */
const HELD = new Set<string>([
  "Jaclyn Bouzakis|PA",
  "Katherine Donohue|VA",
  "Timi Coles|PA",
  "Lily Torres|CO",
])

async function all<T>(table: string, select: string, filter: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(sb.from(table).select(select)).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return out
}

const sex = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase()
  return s.startsWith("f") ? "F" : s.startsWith("m") ? "M" : ""
}

async function main() {
  type Athlete = { id: string; name: string; gender: string | null; is_nc_athlete: boolean | null }
  type Bout = { id: string; athlete_id: string; athlete_name: string; athlete_club: string | null; gender: string | null; event_key: string }
  const athletes = new Map((await all<Athlete>("athletes", "id,name,gender,is_nc_athlete", (q) => q)).map((a) => [a.id, a]))
  const bouts = await all<Bout>("other_tournament_bouts", "id,athlete_id,athlete_name,athlete_club,gender,event_key", (q) =>
    q.not("athlete_id", "is", null),
  )

  const wrong: Array<Bout & { why: string }> = []
  const held = new Set<string>()
  for (const b of bouts) {
    const a = athletes.get(b.athlete_id)
    if (!a) continue
    if (GENDER && sex(a.gender) !== sex(GENDER)) continue
    const club = String(b.athlete_club ?? "").trim().toUpperCase()
    if (REVIEWED.has(`${a.name}|${club}`)) continue
    if (HELD.has(`${a.name}|${club}`)) {
      held.add(`${a.name} <- ${b.athlete_name}, ${club}`)
      continue
    }
    if (sex(b.gender) && sex(a.gender) && sex(b.gender) !== sex(a.gender)) wrong.push({ ...b, why: "gender" })
    else if (a.is_nc_athlete !== false && /^[A-Z]{2}$/.test(club) && club !== "NC") wrong.push({ ...b, why: `entered for ${club}` })
  }

  const grouped = new Map<string, number>()
  for (const b of wrong) {
    const a = athletes.get(b.athlete_id)!
    const key = `${a.name} (${a.gender}) <- ${b.athlete_name}, ${b.athlete_club}, ${b.event_key.replace(/-\d{4}.*$/, "")}: ${b.why}`
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }
  for (const [k, n] of [...grouped.entries()].sort()) console.log(`${String(n).padStart(4)}  ${k}`)
  console.log(`\n${wrong.length} wrongly linked bouts on ${new Set(wrong.map((b) => b.athlete_id)).size} profiles`)
  if (held.size) console.log(`Held for review, left linked: ${[...held].join("; ")}`)

  if (!UNLINK) {
    if (wrong.length) console.log("Report only. --unlink clears these athlete_ids after you have read the list.")
    return
  }
  const ids = wrong.map((b) => b.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await sb.from("other_tournament_bouts").update({ athlete_id: null }).in("id", ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
  }
  console.log(`Unlinked ${ids.length}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
