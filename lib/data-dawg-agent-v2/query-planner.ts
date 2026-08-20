/**
 * Data Dawg 2.0 — deterministic query planner.
 *
 * Routes high-confidence structured questions to SQL tools before the OpenAI
 * tool loop. Name lookups / school dossiers stay on their fast paths; residual
 * questions still use the LLM tool loop.
 *
 * Embeddings are intentionally NOT used here — every intent below maps to
 * deterministic facts in Supabase (or curated verified lists).
 */

export type DataDawgSourceMeta = {
  /** Primary dataset(s) the answer came from. */
  datasets: string[]
  /** How the fact was produced. */
  verification: "curated_list" | "structured_db" | "directory_row" | "computed_aggregate"
  /** Planner confidence that this intent matches the user question. */
  confidence: "high" | "medium" | "low"
}

export type PlannedDataDawgQuery =
  | {
      intent: "nchsaa_multi_time_state_champions"
      times: 2 | 3 | 4
      source: DataDawgSourceMeta
    }
  | {
      intent: "nchsaa_multi_time_state_placers"
      times: 2 | 3 | 4
      source: DataDawgSourceMeta
    }
  | {
      intent: "nhsca_multi_time_all_americans_by_class"
      times: 2 | 3 | 4
      graduation_year: number
      exact: boolean
      source: DataDawgSourceMeta
    }
  | {
      intent: "nchsaa_dual_team_champions"
      year: number | null
      division: string | null
      school: string | null
      leaderboard: boolean
      source: DataDawgSourceMeta
    }
  | {
      intent: "public_rankings_search"
      graduation_year: number | null
      gender: "Male" | "Female"
      limit: number | null
      list_available_years: boolean
      source: DataDawgSourceMeta
    }
  | {
      intent: "record_books_search"
      mode: "career" | "single_season" | "both"
      query: string | null
      min_wins: number | null
      season: string | null
      school: string | null
      source: DataDawgSourceMeta
    }
  | {
      intent: "college_commits_search"
      query: string | null
      college: string | null
      grad_year: number | null
      gender: "Male" | "Female" | null
      division: "NCAA Division I" | "NCAA Division II" | "NCAA Division III" | "NAIA" | "NJCAA" | null
      limit: number
      source: DataDawgSourceMeta
    }
  | {
      intent: "dave_schultz_award_search"
      query: string | null
      year: number | null
      source: DataDawgSourceMeta
    }
  | {
      intent: "tricia_saunders_award_search"
      query: string | null
      year: number | null
      source: DataDawgSourceMeta
    }

const YEAR_RE = /\b(19\d{2}|20\d{2})\b/
const SEASON_RE = /\b(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2})\b/
const MIN_WINS_RE = /\b(\d{2,3})\s*(?:\+|or more|or more wins|wins or more)\b|\b(?:at least|minimum of)\s*(\d{2,3})\s*wins?\b/i

function extractYear(text: string): number | null {
  const m = text.match(YEAR_RE)
  if (!m) return null
  const y = parseInt(m[1], 10)
  if (y < 1990 || y > 2035) return null
  return y
}

function extractTimes(lower: string): 2 | 3 | 4 | null {
  if (/\b4\s*[x×]\b|\bfour[\s-]?time\b|\b4[\s-]?time\b/.test(lower)) return 4
  if (/\b3\s*[x×]\b|\bthree[\s-]?time\b|\b3[\s-]?time\b/.test(lower)) return 3
  if (/\b2\s*[x×]\b|\btwo[\s-]?time\b|\b2[\s-]?time\b|\bdouble[\s-]?champ/.test(lower)) return 2
  return null
}

function extractClassYear(lower: string): number | null {
  const m = lower.match(/\bclass\s+of\s+(20\d{2})\b/)
  if (!m) return null
  const y = parseInt(m[1], 10)
  return y >= 2000 && y <= 2035 ? y : null
}

function looksLikePersonComparison(lower: string): boolean {
  return (
    /\bcompare\b/.test(lower) ||
    /\bvs\.?\b/.test(lower) ||
    /\bversus\b/.test(lower) ||
    /\bwho (?:is|was) better\b/.test(lower) ||
    /\bwho has more\b/.test(lower)
  )
}

/**
 * Classify a user message into a structured tool plan, or null to fall through.
 * Pure function — no DB / OpenAI.
 */
export function planDataDawgQuery(message: string): PlannedDataDawgQuery | null {
  const text = String(message ?? "").trim()
  if (!text || text.length > 400) return null
  const lower = text.toLowerCase()

  // Leave ambiguous comparisons / multi-entity questions to a later comparison tool.
  if (looksLikePersonComparison(lower) && !/\bdual\b/.test(lower)) {
    return null
  }

  // --- Multi-time NCHSAA champions / placers ---
  const times = extractTimes(lower)
  if (
    times != null &&
    /\bnhsca\b/.test(lower) &&
    (/\ball[-\s]?americans?\b/.test(lower) || /\baa\b/.test(lower))
  ) {
    const graduationYear = extractClassYear(lower)
    if (graduationYear != null) {
      return {
        intent: "nhsca_multi_time_all_americans_by_class",
        times,
        graduation_year: graduationYear,
        exact: !/\b(?:at\s+least|or\s+more|\+)\b/.test(lower),
        source: {
          datasets: ["athletes", "nhsca_placements", "wrestling_nhsca_results"],
          verification: "computed_aggregate",
          confidence: "high",
        },
      }
    }
  }
  if (times != null) {
    const wantsPlacer =
      /\bplacers?\b/.test(lower) ||
      /\bplace\s+winners?\b/.test(lower) ||
      /\bstate\s+places?\b/.test(lower)
    const wantsChamp =
      /\bchamps?\b/.test(lower) ||
      /\bchampions?\b/.test(lower) ||
      /\btitles?\b/.test(lower) ||
      /\bstate\s+titles?\b/.test(lower)

    if (wantsPlacer && !wantsChamp) {
      return {
        intent: "nchsaa_multi_time_state_placers",
        times,
        source: {
          datasets:
            times === 4
              ? ["nchsaa_four_time_state_placers (curated)", "wrestling_nchsaa_results"]
              : ["wrestling_nchsaa_results"],
          verification: times === 4 ? "curated_list" : "computed_aggregate",
          confidence: "high",
        },
      }
    }
    if (wantsChamp || (wantsPlacer && wantsChamp && /\bchamp/.test(lower))) {
      // "4x state champs" / "four-time champions" — not bare "4x" alone.
      if (wantsChamp || /\bstate\b/.test(lower)) {
        return {
          intent: "nchsaa_multi_time_state_champions",
          times,
          source: {
            datasets:
              times === 4
                ? ["nchsaa_four_time_state_champions (curated)", "wrestling_nchsaa_results"]
                : ["wrestling_nchsaa_results"],
            verification: times === 4 ? "curated_list" : "computed_aggregate",
            confidence: "high",
          },
        }
      }
    }
    if (wantsPlacer) {
      return {
        intent: "nchsaa_multi_time_state_placers",
        times,
        source: {
          datasets:
            times === 4
              ? ["nchsaa_four_time_state_placers (curated)", "wrestling_nchsaa_results"]
              : ["wrestling_nchsaa_results"],
          verification: times === 4 ? "curated_list" : "computed_aggregate",
          confidence: "high",
        },
      }
    }
  }

  // --- Dave Schultz / Tricia Saunders (before generic year+award noise) ---
  if (/\bdave\s+schultz\b/.test(lower) || /\bschultz\s+award\b/.test(lower)) {
    return {
      intent: "dave_schultz_award_search",
      year: extractYear(text),
      query: null,
      source: {
        datasets: ["dave_schultz_award"],
        verification: "structured_db",
        confidence: "high",
      },
    }
  }
  if (/\btricia\s+saunders\b/.test(lower) || /\bsaunders\s+award\b/.test(lower)) {
    return {
      intent: "tricia_saunders_award_search",
      year: extractYear(text),
      query: null,
      source: {
        datasets: ["tricia_saunders_award"],
        verification: "structured_db",
        confidence: "high",
      },
    }
  }

  // --- Dual team state champions ---
  const dualish =
    /\bdual\s*team\b/.test(lower) ||
    /\bstate\s+duals?\b/.test(lower) ||
    /\bduals?\s+(?:state|champions?|titles?|winners?)\b/.test(lower) ||
    /\bnchsaa\s+duals?\b/.test(lower)
  if (dualish) {
    const leaderboard =
      /\bmost\b/.test(lower) ||
      /\bleaderboard\b/.test(lower) ||
      /\bwhich\s+(?:team|school)\s+has\b/.test(lower) ||
      /\bwho\s+has\s+(?:the\s+)?most\b/.test(lower)
    const year = leaderboard ? null : extractYear(text)
    let division: string | null = null
    const divM = lower.match(/\b([1-8])\s*a\b/)
    if (divM) division = `${divM[1]}A`
    return {
      intent: "nchsaa_dual_team_champions",
      year,
      division,
      school: null,
      leaderboard,
      source: {
        datasets: ["dual_team_champions"],
        verification: leaderboard ? "computed_aggregate" : "structured_db",
        confidence: "high",
      },
    }
  }

  // --- Prospect rankings ---
  const rankingsish =
    /\brankings?\b/.test(lower) ||
    /\bprospect\s+rank(?:ings?)?\b/.test(lower) ||
    /\btop\s+\d+\b/.test(lower) && /\bclass\s+of\b/.test(lower)
  if (rankingsish && (/\bclass\s+of\b/.test(lower) || /\bprospect\b/.test(lower) || /\brankings?\b/.test(lower))) {
    // Avoid grabbing bare "rankings" about tournament seeding without class context when it's clearly something else.
    if (/\bseed(?:ed|ing|s)?\b/.test(lower) && !/\bclass\s+of\b/.test(lower) && !/\bprospect\b/.test(lower)) {
      return null
    }
    const gy =
      (() => {
        const gy = extractClassYear(lower)
        if (gy != null) return gy
        return extractYear(text)
      })() ?? null
    const gender: "Male" | "Female" =
      /\b(women|woman|girls?|female)\b/.test(lower) && !/\b(men|boys?|male)\b/.test(lower)
        ? "Female"
        : "Male"
    const topM = lower.match(/\btop\s+(\d+)\b/)
    const limit = topM ? Math.min(Math.max(parseInt(topM[1], 10), 1), 30) : null
    const listYears = /\bwhich\s+years?\b/.test(lower) || /\bavailable\s+years?\b/.test(lower)
    if (gy != null || listYears || /\bclass\s+of\b/.test(lower) || /\bprospect\s+rank/.test(lower)) {
      return {
        intent: "public_rankings_search",
        graduation_year: listYears ? null : gy,
        gender,
        limit,
        list_available_years: listYears && gy == null,
        source: {
          datasets: ["athletes.prospect_ranking"],
          verification: "structured_db",
          confidence: "high",
        },
      }
    }
  }

  // --- Record books ---
  const recordish =
    /\bwinningest\b/.test(lower) ||
    /\bmost\s+(?:career\s+)?wins\b/.test(lower) ||
    /\bcareer\s+wins?\b/.test(lower) ||
    /\bsingle[\s-]?season\b/.test(lower) ||
    /\brecord\s+books?\b/.test(lower) ||
    /\bmost\s+victories\b/.test(lower) ||
    MIN_WINS_RE.test(text)
  if (recordish) {
    let mode: "career" | "single_season" | "both" = "both"
    if (/\bsingle[\s-]?season\b/.test(lower) || /\bseason\s+record\b/.test(lower) || MIN_WINS_RE.test(text)) {
      mode = "single_season"
    } else if (/\bcareer\b/.test(lower) || /\ball[\s-]?time\b/.test(lower) || /\bwinningest\b/.test(lower)) {
      mode = /\bsingle/.test(lower) ? "both" : "career"
    }
    const seasonM = text.match(SEASON_RE)
    const season = seasonM ? `${seasonM[1]}-${seasonM[2]}` : null
    const minM = text.match(MIN_WINS_RE)
    const min_wins = minM ? parseInt(minM[1] || minM[2], 10) : null
    return {
      intent: "record_books_search",
      mode,
      query: null,
      min_wins,
      season,
      school: null,
      source: {
        datasets: ["career_winningest_wrestlers", "winningest_wrestlers"],
        verification: "structured_db",
        confidence: "high",
      },
    }
  }

  // --- College commits (list/search — not a named athlete dossier) ---
  /**
   * Pull the college out of "who committed to X" / "commits to X" / "signed with X".
   * The planner used to send query: null here, so "who committed to NC State" ran an unfiltered
   * search and answered with all 161 commitments in the state.
   */
  const extractCommitCollege = (raw: string): string | null => {
    const m =
      /\b(?:committed|commits?|signed|signing)\s+(?:to|with|at)\s+(.+)$/i.exec(raw) ??
      /\bcommits?\s+(?:for|from)\s+(.+)$/i.exec(raw)
    if (!m) return null
    let candidate = m[1]
      .replace(/[?!.,]+\s*$/, "")
      .replace(/\b(?:this|next|last)\s+year\b/gi, "")
      .replace(/\bin\s+\d{4}\b/gi, "")
      .replace(/\bclass\s+of\s+\d{4}\b/gi, "")
      .trim()
    // Guard against the generic phrasings — "who committed to college" is not a college.
    if (!candidate || /^(a|an|the)?\s*(college|colleges|school|schools|d\s?[123]|division\s+\w+)$/i.test(candidate)) {
      return null
    }
    return candidate.length > 60 ? null : candidate
  }

  const commitsish =
    /\bcollege\s+commits?\b/.test(lower) ||
    /\bwho\s+(?:has\s+)?committed\b/.test(lower) ||
    /\bcommits?\s+to\b/.test(lower) ||
    /\blist\s+(?:of\s+)?commits?\b/.test(lower) ||
    /\bcommitment\s+(?:list|class)\b/.test(lower)
  if (commitsish) {
    const gy = (() => {
      const y = extractClassYear(lower)
      if (y != null) return y
      return extractYear(text)
    })()
    const gender = /\b(women|woman|girls?|female)\b/.test(lower)
      ? "Female"
      : /\b(men|mens|men's|boys?|male)\b/.test(lower)
        ? "Male"
        : null
    const division = /\b(?:d1|di|division\s+(?:1|i))\b/.test(lower)
      ? "NCAA Division I"
      : /\b(?:d2|dii|division\s+(?:2|ii))\b/.test(lower)
        ? "NCAA Division II"
        : /\b(?:d3|diii|division\s+(?:3|iii))\b/.test(lower)
          ? "NCAA Division III"
          : /\bnaia\b/.test(lower)
            ? "NAIA"
            : /\b(?:njcaa|juco)\b/.test(lower)
              ? "NJCAA"
              : null
    return {
      intent: "college_commits_search",
      query: null,
      college: extractCommitCollege(text),
      grad_year: gy,
      gender,
      division,
      limit: /\ball\b/.test(lower) ? 200 : 40,
      source: {
        datasets: ["athletes (college)"],
        verification: "directory_row",
        confidence: "high",
      },
    }
  }

  return null
}

/** Append source / verification / confidence footer for factual answers. */
export function appendSourceFooter(answer: string, source: DataDawgSourceMeta): string {
  const body = answer.trimEnd()
  const lines = [
    "",
    "---",
    `Source dataset: ${source.datasets.join("; ")}`,
    `Verification: ${source.verification.replace(/_/g, " ")}`,
    `Confidence: ${source.confidence}`,
  ]
  return `${body}\n${lines.join("\n")}`
}
