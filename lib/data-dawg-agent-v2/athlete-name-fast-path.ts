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
import {
  crossStoreHasUsefulHits,
  crossStoreNamesWrestler,
} from "./format-cross-store-athlete-markdown"
import { searchWebForWrestler } from "@/lib/data-dawg-web-search"
import { buildCareerSummary } from "./tournament-bouts"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

export { isLikelyAthleteNameLookup } from "./athlete-name-fast-path-detect"

export type AthleteFastPathHit = {
  /** Verified facts, JSON-serialisable, for the model to answer from. */
  facts: unknown
  athleteId: string | null
  /** Where the facts came from — alumni rows read differently from a directory profile. */
  kind: "directory" | "historical" | "unprofiled" | "web"
  /** Pages a web answer drew on. Present only for kind "web", and shown with the answer. */
  sources?: string[]
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

  /*
   * Alumni / no clear directory id — the historical stores (Brandon Palmer path) and the imported
   * brackets, asked at the same time.
   *
   * These were sequential, and the chain reached about two and a half seconds warm and over seven
   * cold. That is close enough to a function limit to be swallowed, and a swallowed lookup reads
   * as "I couldn't find any records" — which is how both Landon Lee and Nick Meza came back
   * unknown while their bouts sat in the table. Neither answer depends on the other, so neither
   * should wait for it.
   */
  const [cross, bouts] = await Promise.all([
    toolWrestlingCrossStoreSearch({ query: phrase, limit: 40 }),
    toolTournamentBoutsSearch({ wrestler: phrase }),
  ])
  /*
   * The historical stores win only when they are about the wrestler asked for.
   *
   * Their search is fuzzy, and one hit on a shared first name used to be enough to skip the
   * national brackets: "what do we have on Nick Meza" came back with no records and an unrelated
   * Nick Sweet from Havelock, while thirteen of Meza's bouts sat in the bracket table. So a hit
   * that does not name him gives way to brackets that do.
   */
  const boutsName = !("error" in bouts) && bouts.bouts?.length ? String(bouts.name ?? "") : ""
  const boutsAreHim = boutsName.length > 0 && namesLikelySamePerson(boutsName, phrase)
  const crossIsHim = crossStoreNamesWrestler(cross as never, phrase)
  if (!crossStoreHasUsefulHits(cross as never) || (!crossIsHim && boutsAreHim)) {
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
    /*
     * Nothing of ours anywhere. The public web is the last resort, and only here — never beside
     * our own data, where it could contradict a bout we actually hold. See lib/data-dawg-web-search.
     */
    /*
     * `error` here is the tool's ordinary "no athlete found", not a failure — a real database
     * error is swallowed a layer below and also arrives as nothing, which is a weakness worth
     * knowing: we cannot yet tell "we hold none" from "we could not look".
     */
    if ("error" in bouts || !bouts.bouts?.length) {
      // Bounded, because this runs inside the request: a search that outlives the function turns
      // a slow answer into a swallowed timeout, which reads as "no records". Six seconds was too
      // tight — the search itself takes seven — so ten, and a miss is a miss rather than a lie.
      const web = await searchWebForWrestler(phrase, null, { timeoutMs: 10_000 })
      if (!web) return null
      return {
        facts: {
          profile_url: null,
          not_in_our_data: true,
          writing_notes: [
            "This wrestler is NOT in RecruitNC data. Everything below came from a public web search and is shown with its sources; it is not ours and is not used in rankings or scouting reports.",
            "Write the name as plain text — no profile link, and never invent one.",
            "Report only what the summary states. Do not add a placement, a record or a school the search did not give you, and do not present any of it as our data.",
          ],
          web_summary: web.summary,
          sources: web.sources,
        },
        athleteId: null,
        kind: "web",
        sources: web.sources,
      }
    }

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
    /*
     * The two sources spell him differently: the brackets say "Nick Meza", Arizona's placer list
     * says "nicholas meza", and a full-name lookup finds neither from the other — so the 2026
     * Arizona D1 champion read as having never placed at his own state tournament.
     *
     * Failing the full name, ask by surname within the state and let the product's own matcher
     * decide, which already knows Nick is Nicholas and that Adrian Meza is somebody else.
     */
    const wanted = bouts.name ?? phrase
    let placements: Array<Record<string, unknown>> = []
    if (state) {
      const exact = await toolStatePlacersSearch({ wrestler: wanted, state })
      placements = !("error" in exact) ? exact.placers : []
      if (!placements.length) {
        const surname = wanted.trim().split(/\s+/).slice(-1)[0] ?? ""
        if (surname.length > 2) {
          const loose = await toolStatePlacersSearch({ wrestler: surname, state })
          placements = !("error" in loose)
            ? loose.placers.filter((p) => namesLikelySamePerson(String(p.wrestler ?? ""), wanted))
            : []
        }
      }
    }

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
          "career_summary.lines IS THE ANSWER, already written and in the right order. Use those sentences — keep their wording for anything we do not hold, and never replace \"none on file\" with a claim that he entered, attended or \"has no recorded results\". You may tidy them into prose and add the bouts beneath, nothing more.",
          "ANSWER IN THIS ORDER, from career_summary: (1) which state he wrestles for, in the first sentence; (2) his own state tournament — the finish and year, every year on file; (3) NHSCA with record and placement, every year; (4) Super 32 with record; (5) Fargo freestyle with record. Greco and anything else come after, briefly.",
          "Where a section of career_summary is empty, SAY it is empty — \"no Super 32 on file\" — and never leave it out. Silence reads as \"he never went\", which is a claim we cannot make: we may simply not have imported it.",
          "An empty section means WE DO NOT HOLD IT. Never write that he entered, attended, participated in or competed at an event whose section is empty, and never that he has \"no recorded results\" there — both state as fact something we do not know. The only honest sentence is that we have none on file.",
          "For a career record across years use career_summary.careerRecords verbatim — it is already worked out. Do NOT add up the per-year records yourself: asked for a four-year NHSCA record the sum came out \"18-11\" when it was 17-9. A null there means we hold nothing, not 0-0.",
          "NEVER nest a bullet. The chat flattens an indented bullet into the same list, so bouts tucked under an event come out level with it and the whole answer reads as one jumbled run.",
          "One event on file: give its record and finish in the prose, then its bouts as one flat list — that reads well. Several events: one bullet per event and nothing beneath it (`**2026 NHSCA Nationals** — 132 lbs · 5-2 · 5th`), then offer the matches: \"ask about any of those and I will give you the bouts\".",
          "A null placement means he did not reach a placement match, not that we are missing it.",
          "These are the bouts we hold, not necessarily the whole career: we may not have imported every event.",
        ],
        /*
         * The answer's running order, decided here: state, his own state tournament, then NHSCA,
         * Super 32 and Fargo freestyle with records, every year we hold. An order described to a
         * model is an order it follows most of the time.
         */
        career_summary: buildCareerSummary(state, placements, bouts.events ?? []),
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
