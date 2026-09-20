/**
 * Fills in how each TOC bout was won, from the scoring table's match export.
 *
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/import-toc-bout-scores.ts <csv> [--apply]
 *
 * The mat recorded winners live, one tap each, which is all the leaderboard needs. The export adds
 * the method and the score — "Pin 10-4" rather than a name — so the brackets in the app read like
 * results instead of a list of survivors.
 *
 * Rows are matched to bouts by the pair who wrestled, never by round name: the export calls round
 * one "Quarter-Finals" and the draw calls it "Round 1", and a consolation bracket has two bouts
 * with the same label. The pair is unambiguous. A row whose pair is not in the draw is reported
 * and skipped rather than guessed at.
 *
 * Dry run by default. Nothing is written without --apply.
 */
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import type { TocBracketDraw, TocBracketSlot } from "@/lib/toc/bracket-types"

const file = process.argv[2]
const apply = process.argv.includes("--apply")
if (!file) throw new Error("usage: <csv> [--apply]")

/** The export wraps every cell as ="value" so spreadsheets keep leading zeroes. */
function cells(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === "," && !quoted) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.replace(/^=/, "").trim())
}

const key = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "")

/** "10-4 5:32" → 10 and 4; the trailing time is the fall or tech time, which we do not store. */
function parseScore(result: string): { winner: number; loser: number } | null {
  const m = result.match(/^(\d+)\s*-\s*(\d+)/)
  if (!m) return null
  return { winner: Number(m[1]), loser: Number(m[2]) }
}

/** Export win types → the four the app stores. Anything else keeps a null method. */
const METHODS: Record<string, "FALL" | "TF" | "MAJ" | "DEC"> = {
  F: "FALL",
  FALL: "FALL",
  TF: "TF",
  MD: "MAJ",
  DEC: "DEC",
}

type Row = { weight: number; round: string; winner: string; loser: string; result: string; winType: string }

/**
 * The two vocabularies for the same six rounds. The export calls round one "Quarter-Finals" —
 * true of an eight-man bracket — while the draw calls it "Round 1".
 */
type Round = "r1" | "semi" | "final" | "consi-r1" | "consi-semi" | "third" | "other"

function drawRound(side: string, label: string): Round {
  if (/championship/i.test(label)) return "final"
  if (/3rd/i.test(label)) return "third"
  if (side === "losers") return /semifinal/i.test(label) ? "consi-semi" : "consi-r1"
  return /semifinal/i.test(label) ? "semi" : "r1"
}

function exportRound(label: string): Round {
  const l = label.toLowerCase()
  if (l.includes("3rd")) return "third"
  if (l.includes("final") && l.includes("semi")) return l.includes("consi") ? "consi-semi" : "semi"
  if (l.includes("consi") && l.includes("semi")) return "consi-semi"
  if (l.includes("consi")) return "consi-r1"
  if (l.includes("quarter")) return "r1"
  if (l === "finals") return "final"
  return "other"
}

void (async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const lines = readFileSync(file, "utf8").trim().split(/\r?\n/)
  const header = cells(lines[0])
  const col = (name: string) => header.indexOf(name)
  const [iWeight, iRound, iWin, iRes, iType, iLose] = ["Weight", "Round", "Winning Wrestler", "Result", "Win Type", "Losing Wrestler"].map(col)

  const rows: Row[] = lines.slice(1).map((line) => {
    const c = cells(line)
    return {
      weight: Number(c[iWeight]),
      round: c[iRound],
      winner: c[iWin],
      loser: c[iLose],
      result: c[iRes],
      winType: c[iType].toUpperCase(),
    }
  })

  const { data: recorded } = await admin.from("toc_bout_results").select("weight_class,bout_number,winner_athlete_id")
  const winnersByWeight = new Map<number, Map<number, string>>()
  for (const r of recorded ?? []) {
    const w = winnersByWeight.get(Number(r.weight_class)) ?? new Map<number, string>()
    w.set(Number(r.bout_number), String(r.winner_athlete_id))
    winnersByWeight.set(Number(r.weight_class), w)
  }

  let matched = 0
  const updates: { weight: number; bout: number; method: string | null; winner: number | null; loser: number | null; loserId: string | null; label: string }[] = []
  const unmatched: string[] = []

  for (const weight of TOC_WEIGHT_CLASSES) {
    const draw = await getLockedDraw(admin, weight)
    if (!draw) continue
    const winners = winnersByWeight.get(weight) ?? new Map<number, string>()
    const nameById = new Map(draw.participants.map((p) => [p.athleteId, p.name]))
    const idByName = new Map(draw.participants.map((p) => [key(p.name), p.athleteId]))

    /** Who actually stood in a slot, following the recorded winners through the feeders. */
    const occupant = (slot: TocBracketSlot, depth = 0): string | null => {
      if (depth > 12 || slot.kind === "empty") return null
      if (slot.kind === "athlete") return slot.athleteId
      const bout = (draw as TocBracketDraw).bouts.find((b) => b.boutNumber === slot.boutNumber)
      if (!bout) return null
      const advancing = (() => {
        const recorded = winners.get(slot.boutNumber)
        if (recorded) return recorded
        /*
         * A bye has no bout to record. 133 ran seven wrestlers after Abdul-Jamil Zaggout missed
         * weight, so the one seed walked into the semifinal and the consolation bracket carried a
         * bye of its own — three rows could not be placed until an unopposed wrestler counted as
         * having advanced.
         */
        const top = occupant(bout.top, depth + 1)
        const bottom = occupant(bout.bottom, depth + 1)
        if (top && !bottom) return top
        if (bottom && !top) return bottom
        return null
      })()
      const winner = advancing
      if (/winner/i.test(slot.label)) return winner
      // Loser of that bout: whichever of its two occupants did not win it.
      const top = occupant(bout.top, depth + 1)
      const bottom = occupant(bout.bottom, depth + 1)
      if (!winner) return null
      return top === winner ? bottom : bottom === winner ? top : null
    }

    /*
     * Keyed on the pair *and* the round, because the same two wrestlers can meet twice. Matthew
     * Akins beat Alexander Moody in round one at 117 and again for third; on the pair alone both
     * rows landed on the third-place bout and the quarter-final was left blank.
     */
    const pairs = new Map<string, number>()
    for (const bout of draw.bouts) {
      const top = occupant(bout.top)
      const bottom = occupant(bout.bottom)
      if (!top || !bottom) continue
      pairs.set(`${[top, bottom].sort().join("|")}@${drawRound(bout.side, bout.roundLabel)}`, bout.boutNumber)
    }

    for (const row of rows.filter((r) => r.weight === weight)) {
      if (row.winType === "BYE") continue
      const winnerId = idByName.get(key(row.winner))
      const loserId = idByName.get(key(row.loser))
      if (!winnerId || !loserId) {
        unmatched.push(`${weight} ${row.round}: ${row.winner} over ${row.loser} — name not in this draw`)
        continue
      }
      const round = exportRound(row.round)
      const bout = pairs.get(`${[winnerId, loserId].sort().join("|")}@${round}`)
      if (bout == null) {
        unmatched.push(`${weight} ${row.round}: ${row.winner} over ${row.loser} — pair not found in the draw`)
        continue
      }
      if (winners.get(bout) !== winnerId) {
        unmatched.push(`${weight} bout ${bout}: export says ${row.winner} won, the mat recorded ${nameById.get(winners.get(bout) ?? "") ?? "nobody"}`)
        continue
      }
      matched++
      const method = METHODS[row.winType] ?? null
      const score = parseScore(row.result)
      updates.push({
        weight,
        bout,
        method,
        winner: score?.winner ?? null,
        loser: score?.loser ?? null,
        loserId,
        label: `${weight} bout ${bout}: ${row.winner} ${row.winType} ${row.result || "—"} over ${row.loser}`,
      })
    }
  }

  console.log(`matched ${matched} of ${rows.filter((r) => TOC_WEIGHT_CLASSES.includes(r.weight as never) && r.winType !== "BYE").length} scored bouts`)
  const noMethod = updates.filter((u) => !u.method)
  if (noMethod.length) console.log(`no stored method (win type outside FALL/TF/MAJ/DEC): ${noMethod.map((u) => u.label).join("; ")}`)
  if (unmatched.length) console.log(`UNMATCHED (${unmatched.length}):\n  ${unmatched.join("\n  ")}`)

  if (!apply) {
    console.log("dry run — nothing written. Re-run with --apply.")
    return
  }

  let written = 0
  for (const u of updates) {
    const { error } = await admin
      .from("toc_bout_results")
      .update({ method: u.method, winner_score: u.winner, loser_score: u.loser, loser_athlete_id: u.loserId, updated_at: new Date().toISOString() })
      .eq("weight_class", u.weight)
      .eq("bout_number", u.bout)
    if (error) throw new Error(`${u.label}: ${error.message}`)
    written++
  }
  console.log(`wrote ${written} bout results`)
})()
