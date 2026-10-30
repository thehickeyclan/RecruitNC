import type { SupabaseClient } from "@supabase/supabase-js"

import { boutsToUnlink, aliasKey, type AliasVerdict, type GuardAthlete, type GuardBout } from "@/lib/bout-link-guard"

/**
 * Runs lib/bout-link-guard.ts over every linked bout (nightly cron, and scripts/audit-bout-links.ts).
 * With `apply`, clears the bouts' athlete_id, the same wrestler's result row at that event under
 * that entry, and marks that result's profile link rejected - so a profile never shows a record
 * whose bouts are gone.
 */
export async function runBoutLinkGuard(admin: SupabaseClient, { apply }: { apply: boolean }) {
  const page = async <T>(table: string, select: string, filter: (q: any) => any = (q) => q): Promise<T[]> => {
    const out: T[] = []
    for (let p = 0; ; p++) {
      const { data, error } = await filter(admin.from(table).select(select)).order("id").range(p * 1000, p * 1000 + 999)
      if (error) throw new Error(`${table}: ${error.message}`)
      out.push(...((data ?? []) as T[]))
      if ((data ?? []).length < 1000) break
    }
    return out
  }
  const [athleteRows, bouts, aliasRows, identityRows] = await Promise.all([
    page<GuardAthlete>("athletes", "id,name,gender,state,highschool"),
    page<GuardBout>("other_tournament_bouts", "id,athlete_id,athlete_name,athlete_club,gender,event_key,weight_class,event_date,year", (q) => q.not("athlete_id", "is", null)),
    page<{ alias_name_raw: string; alias_team: string | null; status: string; identity_id: string | null }>("identity_aliases", "alias_name_raw,alias_team,status,identity_id", (q) => q.eq("source", "other_tournament_bouts")),
    page<{ id: string; athlete_id: string | null }>("athlete_identities", "id,athlete_id", (q) => q.not("athlete_id", "is", null)),
  ])
  const athletes = new Map(athleteRows.map((a) => [a.id, a]))
  const aliases = new Map<string, AliasVerdict>(aliasRows.map((r) => [aliasKey(r.alias_name_raw, r.alias_team), { status: r.status, identityId: r.identity_id }]))
  const identityByAthlete = new Map(identityRows.map((r) => [r.athlete_id!, r.id]))
  const wrong = boutsToUnlink(athletes, bouts, aliases, identityByAthlete)

  let resultsCleared = 0
  if (apply && wrong.length) {
    const ids = wrong.map((b) => b.id)
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await admin.from("other_tournament_bouts").update({ athlete_id: null }).in("id", ids.slice(i, i + 200))
      if (error) throw new Error(`unlink bouts: ${error.message}`)
    }
    // The event result row for the same wrestler and entry, when none of his bouts there remain.
    const groups = new Map<string, (typeof wrong)[number]>()
    for (const b of wrong) groups.set(`${b.athlete_id}|${b.event_key}`, b)
    const kept = new Set(bouts.filter((b) => !ids.includes(b.id)).map((b) => `${b.athlete_id}|${b.event_key}`))
    for (const [key, b] of groups) {
      if (kept.has(key)) continue
      const { data: rows } = await admin.from("other_tournament_results").select("id").eq("athlete_id", b.athlete_id).eq("event_key", b.event_key)
      const rowIds = (rows ?? []).map((r: { id: string }) => r.id)
      if (!rowIds.length) continue
      await admin.from("other_tournament_results").update({ athlete_id: null }).in("id", rowIds)
      await admin
        .from("result_athlete_links")
        .update({ status: "rejected", reason: `bout-link-guard: ${b.why}`, updated_at: new Date().toISOString() })
        .eq("source_table", "other_tournament_results")
        .eq("athlete_id", b.athlete_id)
        .in("source_id", rowIds)
      resultsCleared += rowIds.length
    }
  }
  return { checked: bouts.length, wrong, resultsCleared, athletes }
}
