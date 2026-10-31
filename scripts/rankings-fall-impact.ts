/**
 * Fall 2026 ranking impact: what Journeymen, the Interstate 64 Fall Duals and Super 32 say about
 * each NC boys class board, so staff can re-rank with the evidence in one place.
 *
 *   npx tsx --env-file=.env.local scripts/rankings-fall-impact.ts > docs/rankings-fall-2026-impact.md
 *
 * Per class: every NC wrestler with a bout at one of the three events (ranked or not), his record
 * at each, every NC-vs-NC meeting with both ranks, and flags:
 *   - H2H against the board: a lower-ranked (or unranked) wrestler beat a higher-ranked one
 *   - Unranked with a win over a ranked wrestler
 *   - Ranked wrestler who did not win a bout at any of the three
 * Super 32 seeds come from the published live snapshot. Nothing is typed; absent means absent.
 */
import { createClient } from "@supabase/supabase-js"
import { inState } from "@/lib/recruiting/states"
import { latestSnapshot } from "@/lib/super32-live/snapshot"
import { loadCredentials } from "@/lib/super32-live/credentials"
import { samePerson, type Credential } from "@/lib/super32-live/engine"

const EVENTS: { key: string; label: string; match: (r: Bout) => boolean }[] = [
  { key: "jm", label: "Journeymen", match: (r) => /journeymen fall classic/i.test(r.event_name) && r.year === 2026 },
  { key: "i64", label: "I-64 Fall Duals", match: (r) => /interstate 64 fall duals/i.test(r.event_name) && r.year === 2026 },
  { key: "s32", label: "Super 32", match: (r) => /^2026 super 32$/i.test(r.event_name) },
]
const CLASSES = [2027, 2028, 2029, 2030]

type Bout = {
  event_name: string; year: number; weight_class: string; round: string; athlete_id: string | null; athlete_name: string
  opponent_id: string | null; opponent_name: string | null; opponent_club: string | null; win: boolean; is_bye: boolean; win_type: string; score: string
}
type Ath = { id: string; name: string; graduationyear: number; prospect_ranking: number | null; highschool: string | null }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function pageAll<T>(build: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

const rk = (a: Ath | undefined) => (a?.prospect_ranking ? `#${a.prospect_ranking}` : "unranked")
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
/**
 * What we hold on an opponent. Super 32 rows carry the opponent's state, so the usual name+state
 * rule applies; Journeymen and I-64 rows carry only a club, so there it takes an exact full-name
 * match and says so ("name only, unverified"), never a fuzzy one: the feed has no state, so a namesake from another state can match (an I-64 "Isaiah Hill" from a Virginia club matched a Nevada placer).
 */
function credsFor(b: Bout, creds: Credential[]): string[] {
  const name = b.opponent_name ?? ""
  if (!name) return []
  const st = /^[A-Z]{2}$/.test(b.opponent_club ?? "") ? b.opponent_club : null
  const hits = creds.filter((c) => (!c.gender || c.gender === "boys") && (st ? samePerson({ name, state: st }, c) : norm(c.name) === norm(name)))
  const rank = (c: Credential) => c.kind === "national_rank" ? (c.rank ?? 99) : c.kind === "board_rank" ? 30 + (c.rank ?? 99) : c.kind === "event_champion" ? 100 : c.kind === "state_champion" ? 110 : c.kind === "event_all_american" ? 120 : 130 + (c.rank ?? 8)
  const keep = hits.filter((c) => !(c.kind === "national_rank" && (c.rank ?? 99) > 30) && !(c.kind === "board_rank" && (c.rank ?? 99) > 50))
  const labels = [...new Set(keep.sort((a, b) => rank(a) - rank(b)).map((c) => c.label))]
  return labels.length && !st ? [...labels, "⚠ name only, unverified"] : labels
}
const isNoContest = (b: Bout) => b.is_bye || /^(bye|for|ff|m ?for|dq|inj)/i.test(b.win_type || "")

async function main() {
  const athletes = await pageAll<Ath>((from) =>
    inState(sb.from("athletes").select("id, name, graduationyear, prospect_ranking, highschool"))
      .eq("gender", "Male").in("graduationyear", CLASSES).order("id").range(from, from + 999))
  const byId = new Map(athletes.map((a) => [a.id, a]))
  const ids = athletes.map((a) => a.id)

  const bouts: Bout[] = []
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150)
    bouts.push(...await pageAll<Bout>((from) =>
      sb.from("other_tournament_bouts")
        .select("event_name, year, weight_class, round, athlete_id, athlete_name, opponent_id, opponent_name, opponent_club, win, is_bye, win_type, score")
        .in("athlete_id", chunk).eq("year", 2026).order("id").range(from, from + 999)))
  }
  const fall = bouts.filter((b) => EVENTS.some((e) => e.match(b)))
  const creds = await loadCredentials(sb as never)

  // Unlinked bouts that carry a ranked wrestler's exact name: "entered none" may be a linking gap.
  const unlinked: Bout[] = []
  for (const ev of ["%journeymen fall classic%", "%interstate 64 fall%", "2026 super 32"]) {
    unlinked.push(...await pageAll<Bout>((from) => sb.from("other_tournament_bouts")
      .select("event_name, year, weight_class, round, athlete_id, athlete_name, opponent_id, opponent_name, opponent_club, win, is_bye, win_type, score")
      .eq("year", 2026).ilike("event_name", ev).is("athlete_id", null).order("id").range(from, from + 999)))
  }

  const snap = await latestSnapshot(sb as never, "super32-2026", true)
  const seedOf = new Map<string, number>()
  for (const e of snap?.data.entrants ?? []) for (const b of e.bouts) if (b.opponentSeed) seedOf.set(b.opponent.toLowerCase(), b.opponentSeed)
  const ownSeed = new Map((snap?.data.entrants ?? []).filter((e) => e.athleteId && e.seed).map((e) => [e.athleteId!, e.seed!]))
  const placed = new Map((snap?.data.entrants ?? []).filter((e) => e.athleteId && e.placement).map((e) => [e.athleteId!, e.placement!]))

  const lines: string[] = []
  lines.push("# Fall 2026 ranking impact — NC boys", "")
  lines.push(`Journeymen Fall Classic, Interstate 64 Fall Duals and Super 32, 2026. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from linked bouts (scripts/rankings-fall-impact.ts). Ranks are the current published class boards. Byes and forfeits are shown but never count as a win over anyone.`, "")

  for (const cls of CLASSES) {
    const clsBouts = fall.filter((b) => byId.get(b.athlete_id!)?.graduationyear === cls)
    const who = [...new Set(clsBouts.map((b) => b.athlete_id!))].map((id) => byId.get(id)!)
    const ranked = athletes.filter((a) => a.graduationyear === cls && a.prospect_ranking).sort((a, b) => a.prospect_ranking! - b.prospect_ranking!)
    lines.push(`## Class of ${cls}`, "")
    if (!ranked.length) lines.push("_No published board for this class yet._", "")

    // Flags
    const flags: string[] = []
    for (const b of clsBouts) {
      if (!b.win || isNoContest(b) || !b.opponent_id) continue
      const w = byId.get(b.athlete_id!), l = byId.get(b.opponent_id)
      if (!w || !l) continue
      const ev = EVENTS.find((e) => e.match(b))!.label
      if (l.prospect_ranking && (!w.prospect_ranking || w.prospect_ranking > l.prospect_ranking)) {
        flags.push(`- **${w.name}** (${rk(w)}, ${w.graduationyear}) beat **${l.name}** (${rk(l)}, ${l.graduationyear}) — ${ev} ${b.weight_class}, ${b.win_type} ${b.score}`)
      }
    }
    for (const a of ranked) {
      const mine = clsBouts.filter((b) => b.athlete_id === a.id)
      if (mine.length && !mine.some((b) => b.win && !isNoContest(b))) flags.push(`- **${a.name}** (${rk(a)}) did not win a contested bout at the events he entered`)
    }
    const missing = ranked.filter((a) => !clsBouts.some((b) => b.athlete_id === a.id))
    lines.push("### Flags for the board", "", ...(flags.length ? [...new Set(flags)] : ["_None._"]), "")
    if (missing.length) {
      const gaps = missing.map((a) => ({ a, hits: unlinked.filter((u) => norm(u.athlete_name) === norm(a.name)) }))
      lines.push(`**Ranked but no linked bout at any of the three:** ${gaps.map(({ a, hits }) => `${a.name} (${rk(a)})${hits.length ? ` — ⚠ ${hits.length} unlinked bouts under this exact name at ${[...new Set(hits.map((h) => EVENTS.find((e) => e.match(h))?.label ?? h.event_name))].join(", ")}` : ""}`).join("; ")}`, "")
    }

    lines.push("### Every NC wrestler who competed", "")
    lines.push("| Rank | Wrestler | School | Journeymen | I-64 | Super 32 | Credentialed wins | NC opponents beaten | Lost to NC |", "|---|---|---|---|---|---|---|---|---|")
    who.sort((a, b) => (a.prospect_ranking ?? 999) - (b.prospect_ranking ?? 999) || a.name.localeCompare(b.name))
    for (const a of who) {
      const mine = clsBouts.filter((b) => b.athlete_id === a.id)
      const cell = (key: string) => {
        const ev = EVENTS.find((e) => e.key === key)!
        const bs = mine.filter(ev.match).filter((b) => !b.is_bye)
        if (!bs.length) return ""
        const w = bs.filter((b) => b.win).length, l = bs.length - w
        const extra = key === "s32" ? [ownSeed.get(a.id) ? `#${ownSeed.get(a.id)} seed` : "", placed.get(a.id) ? `**${placed.get(a.id)}th**` : "",
          ...bs.filter((b) => b.win && !isNoContest(b) && seedOf.get((b.opponent_name ?? "").toLowerCase())).map((b) => `beat #${seedOf.get((b.opponent_name ?? "").toLowerCase())}`)].filter(Boolean) : []
        return `${w}-${l} @${bs[0]!.weight_class}${extra.length ? " · " + extra.join(", ") : ""}`
      }
      const beat = mine.filter((b) => b.win && !isNoContest(b) && b.opponent_id && byId.has(b.opponent_id)).map((b) => `${byId.get(b.opponent_id!)!.name} (${rk(byId.get(b.opponent_id!))})`)
      const credWins = mine.filter((b) => b.win && !isNoContest(b) && !(b.opponent_id && byId.has(b.opponent_id)))
        .map((b) => ({ b, c: credsFor(b, creds) })).filter((x) => x.c.length)
        .map((x) => `${x.b.opponent_name} (${x.c.join(", ")}; ${EVENTS.find((e) => e.match(x.b))!.label})`)
      const lost = mine.filter((b) => !b.win && !isNoContest(b) && b.opponent_id && byId.has(b.opponent_id)).map((b) => `${byId.get(b.opponent_id!)!.name} (${rk(byId.get(b.opponent_id!))})`)
      lines.push(`| ${a.prospect_ranking ?? "—"} | ${a.name} | ${a.highschool ?? ""} | ${cell("jm")} | ${cell("i64")} | ${cell("s32")} | ${credWins.join("; ")} | ${[...new Set(beat)].join("; ")} | ${[...new Set(lost)].join("; ")} |`)
    }
    lines.push("")
  }
  console.log(lines.join("\n"))
  process.exit(0)
}
main()
