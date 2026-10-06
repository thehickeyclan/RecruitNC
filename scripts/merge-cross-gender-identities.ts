#!/usr/bin/env npx tsx
/**
 * One wrestler held as two because she wrestled both brackets.
 *
 * Girls routinely enter a boys' state tournament as well as the girls' championship, so the same
 * name and state arrives in a boys' file and a girls' file. The mint keys people on name, state
 * AND gender, so she becomes two identities — Grace Jumper of South Carolina as both a male and a
 * female wrestler — and her record splits between them.
 *
 * The de-duplicator cannot see these: it blocks on gender, so the two never meet.
 *
 * A merge still has to be earned. A boy and a girl of the same name in one state are two people,
 * and nothing about this pairing proves otherwise, so the same corroboration applies as everywhere
 * else: a shared school, or a weight close enough in a season close enough. The survivor is the
 * female identity, because the girls' championship is where her gender is actually stated — her
 * entering a boys' bracket says nothing about it.
 *
 *   npx tsx scripts/merge-cross-gender-identities.ts            # dry run
 *   npx tsx scripts/merge-cross-gender-identities.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { corroborates, type Identity } from "@/lib/identity-dedupe"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const WRITE = process.argv.includes("--write")

async function page<T>(table: string, select: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const all = await page<Identity & { canonical_name: string; primary_school: string | null }>(
    "athlete_identities",
    "id, canonical_name, normalized_name, first_name, last_name, state, gender, graduation_year, athlete_id, first_seen_season, last_seen_season, evidence, primary_school",
  )
  const byKey = new Map<string, typeof all>()
  for (const i of all) {
    if (!i.normalized_name || !i.state) continue
    const k = `${i.normalized_name}|${i.state}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(i)
  }
  const pairs = [...byKey.entries()]
    .map(([k, v]) => ({ k, female: v.find((x) => x.gender === "Female"), male: v.find((x) => x.gender === "Male") }))
    .filter((p) => p.female && p.male)
  console.log(`same name and state, held as both a male and a female identity: ${pairs.length}`)

  const merge: typeof pairs = []
  const hold: Array<{ k: string; why: string }> = []
  for (const p of pairs) {
    const support = corroborates(p.female as Identity, p.male as Identity)
    if (!support) { hold.push({ k: p.k, why: "nothing corroborates it — no shared school, weight or season" }); continue }
    if (p.female!.athlete_id && p.male!.athlete_id && p.female!.athlete_id !== p.male!.athlete_id) {
      hold.push({ k: p.k, why: "each is already a different profile of ours" })
      continue
    }
    merge.push(p)
  }
  console.log(`   corroborated, safe to merge into the female identity: ${merge.length}`)
  console.log(`   held as two people                                  : ${hold.length}`)
  for (const m of merge.slice(0, 8)) console.log(`      ${m.k}: ${m.female!.canonical_name} absorbs the male row`)
  for (const h of hold.slice(0, 6)) console.log(`      HELD ${h.k} — ${h.why}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  let done = 0
  for (const p of merge) {
    const keep = p.female!
    const drop = p.male!
    const { data: theirs } = await sb.from("identity_aliases").select("id, alias_name_raw, alias_team").eq("identity_id", drop.id)
    const { data: mine } = await sb.from("identity_aliases").select("alias_name_raw, alias_team").eq("identity_id", keep.id)
    const held = new Set((mine ?? []).map((m: Record<string, unknown>) => `${m.alias_name_raw}|${m.alias_team ?? ""}`))
    for (const a of (theirs ?? []) as Array<Record<string, unknown>>) {
      const key = `${a.alias_name_raw}|${a.alias_team ?? ""}`
      if (held.has(key)) await sb.from("identity_aliases").delete().eq("id", String(a.id))
      else await sb.from("identity_aliases").update({ identity_id: keep.id }).eq("id", String(a.id))
    }
    await sb.from("result_athlete_links").update({ identity_id: keep.id }).eq("identity_id", drop.id)
    const patch: Record<string, unknown> = {
      evidence: {
        ...(keep.evidence ?? {}),
        merged_from: [{ id: drop.id, name: drop.canonical_name, gender: "Male" }],
        wrestled_boys_bracket: true,
      },
      updated_at: new Date().toISOString(),
    }
    if (!keep.graduation_year && drop.graduation_year) patch.graduation_year = drop.graduation_year
    if (!keep.athlete_id && drop.athlete_id) patch.athlete_id = drop.athlete_id
    await sb.from("athlete_identities").update(patch).eq("id", keep.id)
    const { error } = await sb.from("athlete_identities").delete().eq("id", drop.id)
    if (error) { console.error(`delete FAILED for ${drop.canonical_name}: ${error.message}`); return }
    done++
  }
  console.log(`merged: ${done}`)
  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true })
  console.log(`athlete_identities now holds ${count} rows`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
