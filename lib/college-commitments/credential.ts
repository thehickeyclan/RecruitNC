/**
 * A commitment as a credential: "NC State commit".
 *
 * A coach reading a bout list wants to know who the opponent is, and "committed to Cornell" says
 * something no placement does - that a Division I staff has already decided about him. It sits
 * beside the state and national accolades rather than inside them: those are computed from
 * results (lib/significant-wins.ts) and this is not a result, so the two are kept apart and
 * joined only where they are printed.
 *
 * The short form is the school's familiar name, because "United States Military Academy (Army)
 * commit" is nobody's way of saying it. Everything in brackets is dropped, and a formal name
 * that reads as a system keeps the campus.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { nameWords } from "@/lib/athlete-name-match"

/** "Commonwealth University-Lock Haven (Lock Haven)" -> "Lock Haven"; "Princeton University" -> "Princeton". */
export function shortCollegeName(name: string): string {
  const given = String(name ?? "").trim()
  if (!given) return ""
  const bracket = given.match(/\(([^)]+)\)\s*$/)
  /* A bracket holding an abbreviation or the campus is how the list prints the familiar name. */
  if (bracket && bracket[1] && bracket[1].length <= 24 && !/or\s/i.test(bracket[1])) return bracket[1].trim()
  return given
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(University|College)\s+of\s+/i, "")
    .replace(/\s+Community\s+College\b/i, "")
    .replace(/\s+(University|College)\b/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

export const commitmentCredential = (college: string): string | null => {
  const short = shortCollegeName(college)
  return short ? `${short} commit` : null
}

/**
 * Every committed wrestler we hold, keyed by name.
 *
 * One small query rather than a lookup per bout: a bout list can name forty opponents and the
 * whole committed population is a few hundred rows. A name held by two committed wrestlers is
 * dropped from the map - a bout line carries no class year to tell them apart, and labelling one
 * of them with the other's college is exactly the mistake the match rules exist to prevent.
 */
export async function loadCommitmentCredentials(admin: SupabaseClient): Promise<Record<string, string>> {
  const rows: Array<{ name: string; college: string | null }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("athletes")
      .select("name, college")
      .not("college", "is", null)
      .neq("college", "")
      .order("id")
      .range(from, from + 999)
    if (error) return {}
    rows.push(...((data ?? []) as Array<{ name: string; college: string | null }>))
    if (!data || data.length < 1000) break
  }
  const byName = new Map<string, Set<string>>()
  for (const r of rows) {
    const college = String(r.college ?? "").trim()
    if (!college || college === "Not specified") continue
    const key = nameWords(r.name).join(" ")
    if (!key) continue
    byName.set(key, new Set([...(byName.get(key) ?? []), college]))
  }
  const out: Record<string, string> = {}
  for (const [key, colleges] of byName) {
    if (colleges.size !== 1) continue
    const label = commitmentCredential([...colleges][0]!)
    if (label) out[key] = label
  }
  return out
}
