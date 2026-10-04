/**
 * Resolve a clear wrestler-name lookup to verified facts before the model runs.
 *
 * This used to return finished markdown and skip OpenAI entirely, which is what made every
 * athlete answer identical. It still does the same lookups — the saving was never the model
 * round, it was the search + dossier round trip — but now it hands the facts to the model so
 * the reply is written as conversation.
 */

import {
  carriedAthletePhrase,
  extractAthleteLookupPhrase,
  isLikelyAthleteNameLookup,
  nameFromPastedRow,
  pickClearAthleteId,
} from "./athlete-name-fast-path-detect"
import {
  toolGetAthleteFullDossier,
  toolSearchAthletes,
  toolStatePlacersSearch,
  toolTournamentBoutsSearch,
  toolWrestlingCrossStoreSearch,
} from "./execute-data-tools"
import { crossStoreHasUsefulHits } from "./format-cross-store-athlete-markdown"

export { isLikelyAthleteNameLookup } from "./athlete-name-fast-path-detect"

export type AthleteFastPathHit = {
  /** Verified facts, JSON-serialisable, for the model to answer from. */
  facts: unknown
  athleteId: string | null
  /** Where the facts came from — alumni rows read differently from a directory profile. */
  kind: "directory" | "historical" | "unprofiled"
}

export async function tryAthleteNameFastPath(
  message: string,
  history?: Array<{ role?: string; content?: string }>,
): Promise<AthleteFastPathHit | null> {
  /*
   * A follow-up inherits the last turn's wrestler. Without this "what was his record at Super 32"
   * reached the model with no facts, it searched by name, and answered about a different Elijah
   * Brown — the North Carolina one, whose records are in our NC-collected table, rather than the
   * New Yorker the conversation had just established.
   */
  const carried = isLikelyAthleteNameLookup(message) ? null : carriedAthletePhrase(message, history)
  // A row pasted from a roster or bracket is a name lookup too, under its other columns.
  const pasted = carried || isLikelyAthleteNameLookup(message) ? null : nameFromPastedRow(message)
  if (!carried && !pasted && !isLikelyAthleteNameLookup(message)) return null

  const phrase = carried ?? pasted ?? extractAthleteLookupPhrase(message)
  if (phrase.length < 3) return null

  const search = await toolSearchAthletes({
    query: phrase,
    limit: 8,
    skipTournamentEnrich: true,
  })

  const rows = (search.rows ?? []) as Record<string, unknown>[]
  const id = pickClearAthleteId(phrase, rows, (search as { disambiguation?: unknown }).disambiguation)

  if (id) {
    const dossier = await toolGetAthleteFullDossier({ athlete_id: id })
    if (!("error" in dossier && dossier.error) && "facts" in dossier && dossier.facts) {
      return { facts: dossier.facts, athleteId: id, kind: "directory" }
    }
  }

  // Alumni / no clear directory id — fall back to the historical stores (Brandon Palmer path).
  const cross = await toolWrestlingCrossStoreSearch({ query: phrase, limit: 40 })
  if (!crossStoreHasUsefulHits(cross as never)) {
    /*
     * Nobody in the directory and nobody in the historical tables — but the national brackets are
     * imported in full, so we hold complete records for thousands of wrestlers who are a name and
     * a team and nothing else. Micah Engelman of Pennsylvania is a two-time NHSCA All-American
     * with 16 bouts here.
     *
     * Done deterministically rather than by asking the model to pick the tool. The prompt told it
     * to and it did not: the answer stayed "I couldn't find any records" while the record sat in
     * the table. A lookup this reliable should not depend on the model choosing to look.
     */
    const bouts = await toolTournamentBoutsSearch({ wrestler: phrase })
    if ("error" in bouts) return null
    if (!bouts.bouts?.length) return null

    /*
     * His own state's tournament, fetched here rather than left to a follow-up.
     *
     * Asked whether Dustin Kohn placed at states, Data Dawg answered that he did not place at the
     * NCHSAA state tournament. He wrestles for Virginia and is the 2026 Virginia 6A champion at
     * 190. The tool to answer that existed and the model did not call it, so the lookup happens
     * here and the answer is in the facts before the question is asked.
     *
     * Narrowed by state: there is a Dustin Kohn in Virginia and another in Oregon.
     */
    const state = typeof bouts.team === "string" && /^[A-Z]{2}$/.test(bouts.team) ? bouts.team : null
    const placers = state ? await toolStatePlacersSearch({ wrestler: bouts.name ?? phrase, state }) : null
    const placements = placers && !("error" in placers) ? placers.placers : []

    return {
      facts: {
        profile_url: null,
        wrestles_for: state,
        writing_notes: [
          `${bouts.wrestler} has no RecruitNC profile. Write the name as plain text — do NOT link it, and never invent a profile URL.`,
          "Say plainly that this wrestler has no RecruitNC profile and that the record is matched on name and team from imported brackets.",
          state
            ? `He wrestles for ${state}. "Did he place at states" means ${state}'s state tournament, NOT the NCHSAA — never answer about North Carolina's tournament for a wrestler from another state.`
            : "No state on file for this wrestler; do not guess which state tournament applies.",
          placements.length
            ? "state_placements below is his own state's finish. Lead with it — it outranks any national result."
            : "We hold no state placement for him, and outside North Carolina we hold the 2026 season only. Say we do not have it rather than that he did not place.",
          "results.events gives each event's record and finish. Lead with those, newest first, and never make the reader count a list of bouts to learn a record.",
          "NEVER nest a bullet. The chat flattens an indented bullet into the same list, so bouts tucked under an event come out level with it and the whole answer reads as one jumbled run.",
          "One event on file: give its record and finish in the prose, then its bouts as one flat list — that reads well. Several events: one bullet per event and nothing beneath it (`**2026 NHSCA Nationals** — 132 lbs · 5-2 · 5th`), then offer the matches: \"ask about any of those and I will give you the bouts\".",
          "A null placement means he did not reach a placement match, not that we are missing it.",
          "These are the bouts we hold, not necessarily the whole career: we may not have imported every event.",
        ],
        state_placements: placements,
        results: bouts,
      },
      athleteId: null,
      kind: "unprofiled",
    }
  }

  // These wrestlers predate the athlete directory, so there is no profile page to link to.
  // Say so explicitly — told only to link the name, the model will otherwise invent a URL.
  return {
    facts: {
      profile_url: null,
      writing_notes: [
        "This wrestler has no RecruitNC profile page. Write the name as plain text — do NOT make it a link, and never invent a profile URL.",
        "These are historical tournament rows, not a directory profile. We may hold nothing beyond what is here; do not read an empty section as proof they never competed.",
      ],
      results: cross,
    },
    athleteId: null,
    kind: "historical",
  }
}
