/**
 * Data Dawg suggested prompts + guaranteed routing.
 * Every prompt we show is mapped to a handler so we never send our own examples to the LLM.
 */

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\?+$/, "")
    // "All-Americans" ↔ "All Americans" so chip routes still match typed variants
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
}

export type SuggestedRoute = { handler: string; params?: Record<string, unknown> }

/** Normalized prompt -> handler + params. Only registered handlers. Used for exact-match routing in API. */
export const SUGGESTED_PROMPT_ROUTES: Array<{ prompt: string; handler: string; params?: Record<string, unknown> }> = [
  // Division / region (division_region)
  { prompt: "what schools are in 3a east?", handler: "division_region" },
  { prompt: "which schools are in 7a east?", handler: "division_region" },
  { prompt: "show me all schools in 4a west", handler: "division_region" },
  { prompt: "how many teams are in 4a west?", handler: "division_region" },
  { prompt: "show me all schools in 8a.", handler: "division_region" },
  // State champs (state_champion_count, state_champion_records)
  { prompt: "how many state titles does faith bane have?", handler: "state_champion_count", params: { wrestlerName: "Faith Bane" } },
  { prompt: "who are our 4x state champions?", handler: "state_champion_records", params: { championshipCount: 4 } },
  { prompt: "who are the 4x state placers?", handler: "state_placer_records", params: { championshipCount: 4 } },
  { prompt: "who are the 4x state place winners?", handler: "state_placer_records", params: { championshipCount: 4 } },
  { prompt: "who are our 4x state placers?", handler: "state_placer_records", params: { championshipCount: 4 } },
  { prompt: "how many 4x state placers have there been?", handler: "state_placer_count", params: { championshipCount: 4 } },
  // NHSCA (nhsca_all_american_count, nhsca_school_leaderboard, nhsca_all_american)
  // NOTE: "Did [name] place at NHSCA?" is NOT here — routed by "did X place at NHSCA?" pre-filter for proper yes/no answers
  { prompt: "what was our best year for nhsca all-americans?", handler: "nhsca_all_american_count" },
  { prompt: "what year did we have the most nhsca all-americans?", handler: "nhsca_all_american_count" },
  { prompt: "which schools had the most nhsca all-americans?", handler: "nhsca_school_leaderboard" },
  { prompt: "which school has the most nhsca all-americans?", handler: "nhsca_school_leaderboard" },
  { prompt: "show all women nhsca all americans", handler: "nhsca_all_american" },
  // Calendar, rivalry (calendar, unc_ncstate_rivalry)
  { prompt: "when are nhsca's?", handler: "calendar" },
  { prompt: "when is the next rivalry match?", handler: "calendar" },
  { prompt: "when is super32?", handler: "calendar" },
  { prompt: "when are state championships?", handler: "calendar" },
  { prompt: "what is the rivalry match?", handler: "unc_ncstate_rivalry" },
  { prompt: "who won last year's rivalry match?", handler: "unc_ncstate_rivalry" },
  { prompt: "who has the longest winning streak in the rivalry?", handler: "unc_ncstate_rivalry" },
  { prompt: "what is nc state's record against unc?", handler: "unc_ncstate_rivalry" },
  { prompt: "what time will we finish?", handler: "calendar" },
  { prompt: "how many wrestlers can i fit with 5 mats for a 7 pm finish?", handler: "calendar" },
  { prompt: "what's a reasonable finish time for a saturday tournament?", handler: "calendar" },
  { prompt: "what are the top reasons nc tournaments fail?", handler: "calendar" },
  // Winningest wrestler (record books / athletes)
  { prompt: "who is the all time winningest wrestler?", handler: "winningest_wrestler" },
  { prompt: "who is the all-time winningest wrestler?", handler: "winningest_wrestler" },
  { prompt: "who has the most wins in a single season?", handler: "winningest_wrestler" },
  { prompt: "show wrestlers with 60 or more wins in a season", handler: "winningest_wrestler" },
]

const ROUTE_MAP = new Map<string, SuggestedRoute>()
for (const r of SUGGESTED_PROMPT_ROUTES) {
  ROUTE_MAP.set(normalizeForMatch(r.prompt), { handler: r.handler, params: r.params })
}

export function getRouteForSuggestedPrompt(userMessage: string): SuggestedRoute | null {
  const n = normalizeForMatch(userMessage)
  return ROUTE_MAP.get(n) ?? null
}

// --- UI: suggested prompts per page (same as before we stripped them) ---

/**
 * Chips are a promise: we asked the question, so it had better answer.
 * Every prompt below was run against the agent and returns a real answer.
 *
 * Deliberately NOT chips (verified failing — restore once the data lands):
 *  - "When are NHSCA's?" / "When are state championships?" / "When is the next Rivalry Match?"
 *    → the events table only holds a few upcoming events, so these answer
 *      "I don't see that event in the calendar." ("When is Super32?" does work.)
 *  - "What region is Davie in?" → "region information is not available"
 *  - "Which colleges have the most Dave Schultz Award winners?" → lists winners by
 *    high school with no college aggregation, i.e. answers a different question.
 *  - "What was our best year for NHSCA All-Americans?" → as a cold chip (no school in
 *    context) it reaches the LLM, which asks who "our" means instead of answering.
 * Their SUGGESTED_PROMPT_ROUTES entries stay, so typing them still routes correctly.
 */
export function getSuggestedPrompts(pathname: string): string[] {
  if (pathname.includes("/rankings") || pathname.includes("/public-rankings")) {
    /*
     * Not a single ranking question, on the rankings pages.
     *
     * Rankings are a paid product and `prospect-rankings.ts` refuses every one of them by
     * design, returning a subscribe link rather than a place. So these four chips - all of
     * which asked for exactly that - were an invitation to be turned down, printed beside the
     * board the reader had already opened. A chip is a promise that the question gets an
     * answer; these promised the one thing the handler will never give.
     *
     * What is left is the record-book material Data Dawg answers well, which is also what
     * somebody reading a ranking tends to ask next.
     */
    return [
      "Who are our 4x state champions?",
      "Who is the all-time winningest wrestler?",
      "Which school has the most NHSCA All-Americans?",
      // Not "most wins in a single season": that routes to winningest_wrestler and answers with
      // the career record instead, which is a different question wearing the same words.
      "Who are the 4x state placers?",
    ]
  }
  if (pathname.includes("/nchsaa")) {
    return [
      "Who won the 4A state championship at 132lbs in 2025?",
      "Who are our 4x state champions?",
      "Who are the 4x state placers?",
      "Which schools are in 7A East?",
      "What are the NCHSAA weight classes?",
    ]
  }
  if (pathname.includes("/nhsca")) {
    return [
      "Which schools had the most NHSCA All-Americans?",
      "Show NHSCA All-Americans in 2026",
      "Show all women NHSCA All Americans",
    ]
  }
  if (pathname.includes("/fargo")) {
    return [
      "Show Fargo results 2026",
      "Who wrestled at Fargo in 2024?",
      "What was Bentley Sly's Fargo record?",
      "Show me Class of 2027 rankings",
    ]
  }
  if (pathname.includes("/schools")) {
    return [
      "Which schools are in 7A East?",
      "How many teams are in 4A West?",
      "Show me all schools in 8A.",
      "Which school has the most state dual championships?",
    ]
  }
  if (pathname.includes("/athletes")) {
    return [
      "Who is the all time winningest wrestler?",
      "Who are our 4x state champions?",
      "Which school has the most NHSCA All-Americans?",
      "Who won the Dave Schultz Award in 2025?",
      "Who won the Tricia Saunders Award in 2025?",
    ]
  }
  if (pathname.includes("/record")) {
    return [
      "Who is the all time winningest wrestler?",
      "Who are our 4x state champions?",
      "Which school has the most NHSCA All-Americans?",
      "Who won the Dave Schultz Award in 2025?",
      "Who won the Tricia Saunders Award in 2025?",
    ]
  }
  if (pathname.includes("/dave-schultz") || pathname.includes("/tricia-saunders")) {
    return [
      "Who won the Dave Schultz Award in 2025?",
      "Show me all Dave Schultz Award winners",
      "Who won the Tricia Saunders Award in 2025?",
      "Show me all Tricia Saunders Award winners",
      "What is the Tricia Saunders Award?",
    ]
  }
  return [
    "Who is Lorenzo Alston?",
    "Show Fargo results 2026",
    "Who won 4A state at 132 in 2025?",
    "Which school has the most state dual championships?",
    "Show me Class of 2027 rankings",
  ]
}

export function getOnboardingExamples(): { category: string; examples: string[] }[] {
  return [
    {
      category: "🏆 Athletes",
      examples: [
        "Who is Lorenzo Alston?",
        "What was Bentley Sly's Fargo record?",
        "Did Faith Bane place at NHSCA?",
        "Who are our 4x state champions?",
      ],
    },
    {
      category: "🏫 Schools",
      examples: [
        "Tell me about Stuart Cramer wrestling",
        "Which school has the most state dual championships?",
        "Which school has the most NHSCA All-Americans?",
        "What region is Davie in?",
      ],
    },
    {
      category: "📊 Tournaments & results",
      examples: [
        "Show Fargo results 2026",
        "Show NHSCA All-Americans in 2025",
        "Show all 4A state placers from 2025",
        "Who wrestled at Fargo in 2024?",
      ],
    },
    {
      category: "📈 Rankings & records",
      examples: [
        "Show me Class of 2027 rankings",
        "Who is the all time winningest wrestler?",
        "Who won the Dave Schultz Award in 2025?",
        "Show all women NHSCA All Americans",
      ],
    },
    {
      category: "📅 Calendar & Events",
      examples: ["When is the next Rivalry Match?", "When are NHSCA's?", "When is Super32?", "When are state championships?"],
    },
  ]
}
