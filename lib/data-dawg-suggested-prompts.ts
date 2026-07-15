/**
 * Data Dawg suggested prompts + guaranteed routing.
 * Every prompt we show is mapped to a handler so we never send our own examples to the LLM.
 */

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\?+$/, "")
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
  // Prospect rankings (default Data Dawg chips)
  { prompt: "show me all class of 2026 rankings", handler: "prospect_rankings", params: { year: 2026, topN: 30 } },
  { prompt: "show me all class of 2027 rankings", handler: "prospect_rankings", params: { year: 2027, topN: 30 } },
  { prompt: "who are the top 10 ranked prospects?", handler: "prospect_rankings", params: { year: 2026, topN: 10 } },
  { prompt: "what athletes are ranked in the top 30?", handler: "prospect_rankings", params: { year: 2026, topN: 30 } },
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
  // Top / best wrestlers → prospect rankings (top 5 per class)
  { prompt: "who are some of the top wrestlers?", handler: "prospect_rankings", params: { years: [2026, 2027, 2028], topN: 5 } },
  { prompt: "who are the top wrestlers?", handler: "prospect_rankings", params: { years: [2026, 2027, 2028], topN: 5 } },
  { prompt: "who are the top wrestlers in 2a?", handler: "prospect_rankings", params: { years: [2026, 2027, 2028], topN: 5 } },
  { prompt: "who are the top wrestlers at 113 1a-2a?", handler: "prospect_rankings", params: { years: [2026, 2027, 2028], topN: 5 } },
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

export function getSuggestedPrompts(pathname: string): string[] {
  if (pathname.includes("/tournament") || pathname.includes("/tools/tournament")) {
    return [
      "What time will we finish?",
      "How many wrestlers can I fit with 5 mats for a 7 PM finish?",
      "What's a reasonable finish time for a Saturday tournament?",
      "What are the top reasons NC tournaments fail?",
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
      "When are NHSCA's?",
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
      "What region is Davie in?",
      "How many teams are in 4A West?",
      "Show me all schools in 8A.",
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
      "Which colleges have the most Dave Schultz Award winners?",
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
