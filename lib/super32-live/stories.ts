/**
 * Top Stories and headlines for the Command Center, picked by fixed rules from the snapshot.
 * Every headline is a template filled from imported results; nothing here is written by a model.
 *
 * Priority (PRD): champion, All-American, Huge win, seeded upset, streak or consolation run, then
 * the round. A wrestler appears twice only for different events. Before results, the stories are
 * a preview of the Wrestlers to Watch, built from their credentials.
 */
import type { SnapshotEntrant, SnapshotRecap } from "./snapshot"

export type StoryKind = "champion" | "all_american" | "huge" | "upset" | "big" | "streak" | "recap" | "preview"

export type Story = {
  id: string
  kind: StoryKind
  label: string
  headline: string
  dek: string
  entrant: SnapshotEntrant | null
  meta: string
  rank: number
  /** When the story's newest result arrived; newer leads among equal ranks. */
  at?: string
}

const ORD = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
const WORD: Record<number, string> = { 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth" }
const wt = (e: SnapshotEntrant) => `${e.gender === "girls" ? "girls' " : ""}${e.weight}`
const lbs = (e: SnapshotEntrant) => (e.weight ? `${e.gender === "girls" ? "Girls " : ""}${e.weight} lbs` : e.gender === "girls" ? "Girls" : e.classYear ? `Class of ${e.classYear}` : "NC")

export function buildStories(entrants: SnapshotEntrant[], recaps: SnapshotRecap[], hasResults: boolean): Story[] {
  const out: Story[] = []
  if (!hasResults) {
    const watch = entrants.filter((e) => e.watch !== null).sort((a, b) => (a.watch ?? 9) - (b.watch ?? 9) || (a.seed ?? 99) - (b.seed ?? 99))
    for (const e of watch.slice(0, 6)) {
      out.push({
        id: `preview:${e.gender}${e.weight}${e.name}`, kind: "preview", label: "Seeded",
        headline: e.seed !== null ? `${e.name} enters as the #${e.seed} seed` : e.weight ? `${e.name} headlines NC at ${e.weight}` : `${e.name} is one to watch`,
        dek: [e.chips.slice(0, 3).join(" · "), e.school].filter(Boolean).join(" — "),
        entrant: e, meta: [lbs(e), e.school].filter(Boolean).join(" · "), rank: 50 + (e.watch ?? 9) + (e.seed ?? 50) / 100,
      })
    }
    return out
  }

  for (const e of entrants) {
    const key = `${e.gender}${e.weight}${e.name}`
    if (e.placement === 1) {
      out.push({ id: `champ:${key}`, kind: "champion", label: "Champion", headline: `${e.name} wins the Super 32 title`,
        dek: `A ${e.wins}-${e.losses} run to the top of the podium at ${wt(e)}.`, entrant: e, meta: `${lbs(e)}`, rank: 1 })
    } else if (e.placement) {
      out.push({ id: `place:${key}`, kind: "all_american", label: "All-American",
        headline: `${e.name} finishes ${WORD[e.placement] ?? ORD(e.placement)} at Super 32`,
        dek: `A ${e.wins}-${e.losses} tournament and an All-American finish at ${wt(e)}.`, entrant: e, meta: `${lbs(e)} · ${ORD(e.placement)}`, rank: 2 + e.placement / 10 })
    } else if (e.aaClinched) {
      out.push({ id: `aa:${key}`, kind: "all_american", label: "All-American", headline: `${e.name} clinches All-American`,
        dek: `${e.wins}-${e.losses} so far at ${wt(e)}, guaranteed a top-eight finish.`, entrant: e, meta: `${lbs(e)}`, rank: 3 })
    }
    // One story per wrestler with seeded wins, led by the newest. A second or third seeded win
    // updates that story instead of sitting under the first one (Matt, 24 Oct).
    const seeded = e.bouts.filter((b) => b.win && (b.tier === "huge" || b.tier === "big")).sort((x, y) => (y.seenAt ?? "").localeCompare(x.seenAt ?? ""))
    const b = seeded[0]
    if (b) {
      const how = [b.winType, b.result].filter(Boolean).join(" ")
      const standing = e.status === "eliminated" ? `finished ${e.wins}-${e.losses}`
        : e.aaClinched ? `now ${e.wins}-${e.losses} and an All-American`
        : e.status === "alive" ? `now ${e.wins}-0 and unbeaten on the championship side`
        : `now ${e.wins}-${e.losses} and alive in the consolations`
      const earlier = seeded.slice(1).map((x) => `${x.reasons[0]} ${x.opponent}`)
      const n = seeded.length
      const headline = n > 1 ? `${e.name} picks up ${e.gender === "girls" ? "her" : "his"} ${ORD(n)} seeded win at Super 32` : b.tier === "huge" ? `${e.name} defeats ${b.reasons[0]}` : b.upset ? `${e.name} upsets ${b.reasons[0]}` : `${e.name} beats ${b.reasons[0]}`
      const dek = `Beat ${b.opponent} (${b.opponentTeam}), ${b.reasons.join(", ")}${how ? `, ${how}` : ""}, ${b.round}${earlier.length ? `, after beating ${earlier.join(" and ")} earlier` : ""}. ${standing[0]!.toUpperCase()}${standing.slice(1)}.`
      const anyHuge = seeded.some((x) => x.tier === "huge")
      out.push({ id: `seeded:${key}:${n}`, kind: anyHuge ? "huge" : b.upset ? "upset" : "big", label: n > 1 ? `${n} seeded wins` : b.tier === "huge" ? "Huge win" : "Big win",
        headline, dek, entrant: e, meta: `${how} · ${b.round} · ${lbs(e)}`, rank: 4, at: b.seenAt ?? "" })
    }
  }
  // Headlines are Huge and Big wins (and placings), plus who is still unbeaten on the
  // championship side. No round recaps or streaks (Matt, 24 Oct).
  const unbeaten = entrants.filter((e) => e.status === "alive" && e.bouts.some((b) => b.winType !== "BYE"))
  if (unbeaten.length) {
    out.push({ id: `champside:${unbeaten.map((e) => e.name).join(",")}`, kind: "recap", label: "Championship bracket",
      headline: `${unbeaten.length} NC ${unbeaten.length === 1 ? "wrestler is" : "wrestlers are"} still unbeaten`,
      dek: unbeaten.map((e) => `${e.name} (${e.gender === "girls" ? "G" : ""}${e.weight}, ${e.wins}-0)`).join(" · "),
      entrant: null, meta: "Championship side", rank: 8 })
  }
  return out.sort((a, b) => a.rank - b.rank || (b.at ?? "").localeCompare(a.at ?? ""))
}
