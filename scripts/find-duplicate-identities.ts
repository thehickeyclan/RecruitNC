#!/usr/bin/env npx tsx
/**
 * Identities that are the same wrestler held twice.
 *
 * The registry keys a person on the exact normalised name, so any spelling difference mints a
 * second human: a nickname in brackets ("Ericson (EJ) Coney" against "Ericson Coney"), a middle
 * initial, a truncation from the source ("zoe-shal" against "zoe-shalom"), a hyphen that became a
 * space. Each one splits a record in half and inflates every count built on the registry.
 *
 * Blocked on surname within a state and gender, then judged pair by pair. Detection only — it
 * prints what it would merge and writes nothing, because merging two brothers is worse than
 * leaving two rows for one wrestler, and Luke and James Gray of South Carolina are already in
 * here sharing a RankWrestlers id.
 *
 *   npx tsx scripts/find-duplicate-identities.ts
 *   npx tsx scripts/find-duplicate-identities.ts --csv ranking-snapshots/duplicate-identities.csv
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { conflict, corroborates, sameNameDifferentSpelling, type Identity } from "@/lib/identity-dedupe"

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
const CSV = process.argv.includes("--csv") ? process.argv[process.argv.indexOf("--csv") + 1] : null
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
  const all = await page<Identity>(
    "athlete_identities",
    "id, canonical_name, normalized_name, first_name, last_name, state, gender, graduation_year, athlete_id, first_seen_season, last_seen_season, evidence",
  )
  const usable = all.filter((i) => i.normalized_name && !i.evidence?.name_incomplete)
  console.log(`identities examined: ${usable.length} of ${all.length}`)

  /*
   * Blocked two ways, because either half of a name can be the one that differs. Surname blocking
   * finds "Will" against "William Jenkins"; it cannot find "Blanco-Cruz" against "Blanco Cruz",
   * where the hyphen moved and the last word changed with it. First-name blocking catches those.
   */
  const blocks = new Map<string, Identity[]>()
  for (const i of usable as Identity[]) {
    for (const k of [
      `last|${i.last_name}|${i.state ?? ""}|${i.gender ?? ""}`,
      `first|${i.first_name}|${i.state ?? ""}|${i.gender ?? ""}`,
    ]) {
      if (!blocks.has(k)) blocks.set(k, [])
      blocks.get(k)!.push(i)
    }
  }
  const sized = [...blocks.values()].filter((v) => v.length > 1)
  console.log(`surname blocks with more than one wrestler: ${sized.length}`)

  type Pair = { a: Identity; b: Identity; why: string; conflict: string | null; support: string | null }
  const pairs: Pair[] = []
  for (const block of sized) {
    for (let i = 0; i < block.length; i++) {
      for (let j = i + 1; j < block.length; j++) {
        const why = sameNameDifferentSpelling(block[i].normalized_name, block[j].normalized_name)
        if (!why) continue
        const support = corroborates(block[i], block[j])
        pairs.push({
          a: block[i],
          b: block[j],
          why,
          conflict: conflict(block[i], block[j]) ?? (support ? null : "nothing corroborates it — no shared school, weight or season"),
          support,
        })
      }
    }
  }
  /* The same pair turns up under both blocking keys; keep it once. */
  const seenPair = new Set<string>()
  const unique = pairs.filter((p) => {
    const k = [p.a.id, p.b.id].sort().join("|")
    if (seenPair.has(k)) return false
    seenPair.add(k)
    return true
  })
  pairs.length = 0
  pairs.push(...unique)
  const merge = pairs.filter((p) => !p.conflict)
  const blocked = pairs.filter((p) => p.conflict)
  console.log(`\ncandidate duplicate pairs: ${pairs.length}`)
  console.log(`   safe to merge  : ${merge.length}`)
  console.log(`   held, conflicting evidence: ${blocked.length}`)

  console.log(`\nwould merge:`)
  for (const p of merge.slice(0, 20)) {
    console.log(`   ${p.a.state} ${p.a.gender}  "${p.a.canonical_name}" + "${p.b.canonical_name}"  — ${p.why}; ${p.support}`)
  }
  if (blocked.length) {
    console.log(`\nheld back as two people:`)
    for (const p of blocked.slice(0, 12)) {
      console.log(`   ${p.a.state}  "${p.a.canonical_name}" vs "${p.b.canonical_name}"  — ${p.conflict}`)
    }
  }

  if (WRITE) {
    /*
     * Merged as components, not as pairs. A ~ B and B ~ C makes one wrestler held three times,
     * and merging the pairs in turn would repoint A's aliases at a row that C's merge then
     * deleted. Union-find gives one survivor per component.
     */
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      const p = parent.get(x)
      if (!p || p === x) return x
      const root = find(p)
      parent.set(x, root)
      return root
    }
    const union = (x: string, y: string) => {
      const rx = find(x)
      const ry = find(y)
      if (rx !== ry) parent.set(rx, ry)
    }
    for (const p of merge) {
      parent.set(p.a.id, parent.get(p.a.id) ?? p.a.id)
      parent.set(p.b.id, parent.get(p.b.id) ?? p.b.id)
      union(p.a.id, p.b.id)
    }
    const components = new Map<string, Identity[]>()
    const byId = new Map((usable as Identity[]).map((i) => [i.id, i]))
    for (const id of parent.keys()) {
      const root = find(id)
      if (!components.has(root)) components.set(root, [])
      components.get(root)!.push(byId.get(id)!)
    }
    console.log(`\nmerging ${parent.size} identities into ${components.size} wrestlers`)

    let merged = 0
    for (const group of components.values()) {
      /*
       * The survivor: one of our profiles first, then a known class year, then the fullest record.
       * Deleting the row an athlete_id points at would detach a recruit from their own identity.
       */
      const survivor = [...group].sort((x, y) => {
        if (Boolean(y.athlete_id) !== Boolean(x.athlete_id)) return y.athlete_id ? 1 : -1
        if (Boolean(y.graduation_year) !== Boolean(x.graduation_year)) return y.graduation_year ? 1 : -1
        const rows = (i: Identity) => Number((i.evidence as { placer_rows?: number } | null)?.placer_rows ?? 0)
        return rows(y) - rows(x)
      })[0]
      const losers = group.filter((g) => g.id !== survivor.id)
      if (!losers.length) continue

      /* The fullest, best-cased spelling to display: "Stacallen Mahoe" over "STACALLE MAHOE". */
      const bestName = [...group]
        .map((g) => g.canonical_name.trim())
        .sort((x, y) => {
          const cased = (n: string) => (/[a-z]/.test(n) && /[A-Z]/.test(n) ? 1 : 0)
          return cased(y) - cased(x) || y.length - x.length
        })[0]

      const mergedEvidence = {
        ...(survivor.evidence ?? {}),
        merged_from: losers.map((l) => ({ id: l.id, name: l.canonical_name, normalized: l.normalized_name })),
        seasons: [...new Set(group.flatMap((g) => ((g.evidence?.seasons as number[] | undefined) ?? [])))].sort(),
        weights: [...new Set(group.flatMap((g) => ((g.evidence?.weights as string[] | undefined) ?? [])))],
        schools: [...new Set(group.flatMap((g) => ((g.evidence?.schools as string[] | undefined) ?? [])))],
        spellings: [...new Set(group.flatMap((g) => ((g.evidence?.spellings as string[] | undefined) ?? [g.canonical_name])))],
        placer_rows: group.reduce((n, g) => n + Number((g.evidence as { placer_rows?: number } | null)?.placer_rows ?? 0), 0),
      }

      const patch: Record<string, unknown> = {
        canonical_name: bestName,
        evidence: mergedEvidence,
        graduation_year: survivor.graduation_year ?? group.find((g) => g.graduation_year)?.graduation_year ?? null,
        state: survivor.state ?? group.find((g) => g.state)?.state ?? null,
        first_seen_season: Math.min(...group.map((g) => g.first_seen_season ?? 9999)) || null,
        last_seen_season: Math.max(...group.map((g) => g.last_seen_season ?? 0)) || null,
        updated_at: new Date().toISOString(),
      }
      const { error: upErr } = await sb.from("athlete_identities").update(patch).eq("id", survivor.id)
      if (upErr) { console.error(`survivor ${bestName} FAILED:`, upErr.message); return }

      for (const loser of losers) {
        /* Aliases the survivor already holds would break the unique key, so drop those first. */
        const { data: mine } = await sb.from("identity_aliases").select("alias_name_raw, alias_team").eq("identity_id", survivor.id)
        const held = new Set((mine ?? []).map((m: Record<string, unknown>) => `${m.alias_name_raw}|${m.alias_team ?? ""}`))
        const { data: theirs } = await sb.from("identity_aliases").select("id, alias_name_raw, alias_team").eq("identity_id", loser.id)
        for (const alias of (theirs ?? []) as Array<Record<string, unknown>>) {
          const key = `${alias.alias_name_raw}|${alias.alias_team ?? ""}`
          if (held.has(key)) await sb.from("identity_aliases").delete().eq("id", String(alias.id))
          else await sb.from("identity_aliases").update({ identity_id: survivor.id }).eq("id", String(alias.id))
        }
        await sb.from("result_athlete_links").update({ identity_id: survivor.id }).eq("identity_id", loser.id)
        const { error: delErr } = await sb.from("athlete_identities").delete().eq("id", loser.id)
        if (delErr) { console.error(`delete ${loser.canonical_name} FAILED:`, delErr.message); return }
        merged++
      }
    }
    console.log(`duplicate identities removed: ${merged}`)
    const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true })
    console.log(`athlete_identities now holds ${count} rows`)
    return
  }

  if (CSV) {
    const esc = (v: unknown) => {
      const t = String(v ?? "")
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
    }
    const head = "verdict,state,gender,keep_id,keep_name,merge_id,merge_name,reason"
    const rows = [
      ...merge.map((p) => ["merge", p.a.state, p.a.gender, p.a.id, p.a.canonical_name, p.b.id, p.b.canonical_name, `${p.why}; ${p.support}`]),
      ...blocked.map((p) => ["hold", p.a.state, p.a.gender, p.a.id, p.a.canonical_name, p.b.id, p.b.canonical_name, p.conflict]),
    ]
    fs.writeFileSync(CSV, [head, ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n")
    console.log(`\nwrote ${CSV} (${rows.length} rows)`)
  }
}
/* Importing this for tests must not run it, and must not need a database. */
if (process.argv[1] && /find-duplicate-identities/.test(process.argv[1])) {
  main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
}
