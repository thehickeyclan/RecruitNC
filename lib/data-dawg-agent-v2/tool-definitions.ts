/**
 * OpenAI Chat Completions `tools` payload (function definitions only).
 */

export const DATA_DAWG_AGENT_TOOLS: Array<{
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}> = [
  {
    type: "function",
    function: {
      name: "search_athletes",
      description:
        "Find athletes in RecruitNC by name or high school (includes alumni / any graduation year — not limited to recent classes). Handles natural phrasing ('tell me about…', 'who is…') and minor misspellings server-side. Each returned row includes `tournament_summary` (merged NHSCA + Super32 + Fargo from placement tables) — prefer that over `nhsca_results` / `super32_results` JSON on the row when they differ.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description:
              "Athlete name and/or school fragment (e.g. 'Jane Smith', 'Jacob Perry Cardinal Gibbons'). Include school when the user named it — disambiguates duplicate names. Min 2 meaningful characters after stripping chat phrases.",
          },
          limit: { type: "integer", description: "Max rows (default 8, max 40)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "wrestling_cross_store_search",
      description:
        "Call once when search_athletes returns zero directory rows (alumni in historical tables only), or for namesake filtering when you are NOT calling get_athlete_full_dossier. One round trip across NCHSAA, NHSCA, Super32, Fargo, and NC United. Skip when you already have a clear directory id and will call get_athlete_full_dossier — the dossier merges those sources. Do not call twice.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "Wrestler name and/or school fragment (same style as search_athletes).",
          },
          limit: {
            type: "integer",
            description:
              "Max rows per underlying table (default ~16 with directory filters, ~32 without; max 50).",
          },
          directory_high_school: {
            type: "string",
            description:
              "From the chosen `search_athletes` row: high school name (substring match). Required when disambiguating duplicate names — drops tournament rows whose school fields contradict this when those fields are non-empty.",
          },
          grad_year: {
            type: "integer",
            description:
              "From the chosen `search_athletes` row: graduation year. When set, drops tournament rows outside an approximate high-school window (grad−6 through grad+1).",
          },
          directory_athlete_id: {
            type: "string",
            description:
              "UUID from the chosen `search_athletes` row. Keeps nhsca_placements rows already linked to this athlete even when school text on an old import differs.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_athlete_full_dossier",
      description:
        "FULL athlete report (legacy Data Dawg format): NCHSAA, duals, Super32, NHSCA, **Fargo Nationals**, NC United, Dave Schultz, career record — same data path as unified profile. Call AFTER search_athletes (and use wrestling_cross_store_search for extra historical rows) whenever answering about a specific athlete by name. Required for 'tell me about [name]' when you have their UUID; do not substitute narrative bio text from other fields.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          athlete_id: {
            type: "string",
            description: "UUID from search_athletes result row `id` field.",
          },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_school_classifications",
      description:
        "Find NC high schools: official classifications (1A–4A, region) plus schools seen on athlete rosters. Use when the user only asks division/region or you need disambiguation between multiple schools. For a general school question ('Avery County', 'tell me about Cardinal Gibbons wrestling'), prefer get_school_wrestling_dossier.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "School name or distinctive fragment (e.g. 'Cardinal Gibbons', 'Page'). Typos are handled server-side.",
          },
          limit: { type: "integer" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_school_wrestling_dossier",
      description:
        "FULL school wrestling report: NCHSAA individual (champions + other placers), dual team state titles, NHSCA nationals (wrestling_nhsca_results + nhsca_placements), Super32 All-Americans (top 8), Dave Schultz and Tricia Saunders award winners, NCHSAA tournament MOW — plus classification when available. Use when the message is mainly a school name or asks about that school's wrestling history, champs, duals, nationals, or All-Americans. Pass the school name only.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "High school name (e.g. 'Avery County', 'Cardinal Gibbons High School').",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nchsaa_dual_team_champions",
      description:
        "NCHSAA **state** dual team championships (state duals / dual team state champions) from `dual_team_champions`. Use for 'show dual team state champions', 'who won state duals', **'who won dual team states in 2026'** (pass year: 2026), 'dual team winners in [year]', **'what team has won the most state dual titles?'**, 'which school has the most dual team championships', 'state dual leaderboard' — for most-titles / leaderboard questions set **leaderboard: true** (do not pass year unless they ask for a single season). Optional filters: year, division (e.g. '4A'), school name fragment. Excludes vacated titles and tournaments not held. NOT NHSCA national duals.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          year: { type: "integer", description: "Optional — filter to this season year." },
          division: { type: "string", description: "Optional — e.g. '4A', '7A', '1A/2A'." },
          school: { type: "string", description: "Optional — champion school name fragment." },
          leaderboard: {
            type: "boolean",
            description:
              "REQUIRED true for 'most state dual titles', 'which team has won the most duals', 'dual team leaderboard'. Returns schools ranked by title_count plus most_titles.",
          },
          limit: {
            type: "integer",
            description: "Max rows (list mode, default ~400) or max schools (leaderboard, default 80).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nhsca_placements_search",
      description:
        "NHSCA national tournament placements (athlete or school) across **all years in DB** — merges `nhsca_placements` and legacy `wrestling_nhsca_results`. Use for All-Americans, national placers, NHSCA history. Prefer `get_athlete_full_dossier` or `wrestling_cross_store_search` for a specific wrestler when you have a name.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "Athlete or school name fragment." },
          year: { type: "integer", description: "Optional filter by tournament year." },
          limit: { type: "integer" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nchsaa_state_results_search",
      description:
        "NCHSAA individual state tournament results (placers/champions) by wrestler or school name fragment — **all years** in `wrestling_nchsaa_results` (1990s–present). Do NOT use for 'who are the 2x/3x/4x state champs' — use nchsaa_multi_time_state_champions instead. For a full athlete report use get_athlete_full_dossier.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "Wrestler or school fragment." },
          limit: { type: "integer" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nchsaa_multi_time_state_champions",
      description:
        "List ALL North Carolina wrestlers who won exactly N individual NCHSAA state championships (place=1), for N = 2, 3, or 4. Use for questions like 'who are the four-time state champions?', '4x state champs', 'three-time state champs', 'how many 4x champs' (call with times=4 then cite total_wrestlers). Does not require a wrestler name. Do NOT use for '4x state placers' / 'place winners' — use nchsaa_multi_time_state_placers.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          times: {
            type: "integer",
            description: "Exact title count: 2, 3, or 4 (e.g. 4 for four-time state champions).",
            enum: [2, 3, 4],
          },
        },
        required: ["times"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nchsaa_multi_time_state_placers",
      description:
        "List ALL North Carolina wrestlers with exactly N individual NCHSAA state places (place 1–6), for N = 2, 3, or 4. Use for 'who are the 4x state placers?', 'four-time state place winners', '3x state placers', 'how many 4x state placers'. Not for title-only champs (use nchsaa_multi_time_state_champions).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          times: {
            type: "integer",
            description: "Exact placement count: 2, 3, or 4 (e.g. 4 for four-time state placers).",
            enum: [2, 3, 4],
          },
        },
        required: ["times"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nhsca_all_americans_by_year",
      description:
        "Full list of NHSCA All-Americans (placements 1–8) for a single tournament year — merges `nhsca_placements` and legacy `wrestling_nhsca_results`. Use for 'show me NHSCA All-Americans in 2022', 'who was an NHSCA All-American in 2017', etc. Not for school-specific history (use get_school_wrestling_dossier).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          year: { type: "integer", description: "NHSCA tournament year (e.g. 2022)." },
          gender: {
            type: "string",
            enum: ["men", "women"],
            description: "Default men unless user asks for girls/women.",
          },
        },
        required: ["year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nchsaa_state_tournament_by_year",
      description:
        "NCHSAA state championship placers for one year from `wrestling_nchsaa_results`. Use for 'show me the results of the 2017 state tournament', 'show all 4A state placers from 2025', '2024 3A state results', etc. Pass `classification` (1A–8A, 1A/2A, 1-4A) when the user names a division. Not for multi-time champs (use nchsaa_multi_time_state_champions) or name search (use nchsaa_state_results_search).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          year: { type: "integer", description: "NCHSAA state tournament year (e.g. 2017)." },
          classification: {
            type: "string",
            description: "Optional NCHSAA division: 1A, 2A, 3A, 4A, 5A, 6A, 7A, 8A, 1A/2A, or 1-4A (women).",
          },
          gender: {
            type: "string",
            enum: ["men", "women"],
            description: "Default men unless user asks for girls/women.",
          },
        },
        required: ["year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fargo_results_by_year",
      description:
        "All NC wrestlers at Fargo Nationals (US Marine Corps Nationals) for one year from `fargo_results`. Freestyle and Greco-Roman are separate rows/careers — do not merge styles. Use for 'show Fargo results 2026', 'who wrestled at Fargo in 2024', 'NC Fargo nationals 2023', etc. Returns athlete name, school, division (16U/Junior), style when present, weight, and record. Not for a single wrestler (use wrestling_cross_store_search or get_athlete_full_dossier).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          year: { type: "integer", description: "Fargo tournament year (e.g. 2026)." },
        },
        required: ["year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "college_commits_search",
      description:
        "Athletes with a college commitment. Optional text search (name, college, school) and/or grad year.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "Optional fragment to filter name, college, or high school.",
          },
          grad_year: { type: "integer", description: "Optional class year filter." },
          limit: { type: "integer" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "public_rankings_search",
      description:
        "RecruitNC official prospect rankings by graduation class (same lists as /public-rankings). Use for 'show me all Class of 2027 rankings', 'class of 2028 rankings', 'top 10 ranked prospects class of 2026', 'who is ranked #1 in 2027'. Years currently published: 2026, 2027, 2028 — **top 30 only** for every class. Default gender Male; pass Female for girls rankings. Always call this for class-of rankings questions — do not use tournament tables alone.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          graduation_year: {
            type: "integer",
            description: "Class year, e.g. 2026, 2027, or 2028.",
          },
          gender: {
            type: "string",
            enum: ["Male", "Female"],
            description: "Default Male.",
          },
          limit: {
            type: "integer",
            description: "Optional max rows (e.g. 10 for top 10). Omit for full public list for that class.",
          },
          list_available_years: {
            type: "boolean",
            description: "If true, return which class years have rankings (ignore graduation_year).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_books_search",
      description:
        "NC high school wrestling record books: all-time career winningest (career_winningest_wrestlers) and/or NCHSAA single-season most victories (winningest_wrestlers — e.g. Colton Palmer 91-0). Use for 'most wins in a single season', '60 or more wins', school/season filters, 'who is the winningest wrestler of all time?', or a named wrestler's record-book entry.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          mode: {
            type: "string",
            enum: ["career", "single_season", "both"],
            description:
              "career = all-time career wins; single_season = NCHSAA single-season most victories; both = return both lists (default both when query is empty).",
          },
          query: {
            type: "string",
            description: "Optional wrestler or school name fragment (e.g. 'Colton Palmer', 'Riverside-Durham').",
          },
          min_wins: {
            type: "integer",
            description: "Optional minimum wins filter for single-season list (e.g. 60).",
          },
          season: {
            type: "string",
            description: "Optional season filter YYYY-YYYY (e.g. '2019-2020').",
          },
          school: {
            type: "string",
            description: "Optional school name filter for single-season list.",
          },
          limit: {
            type: "integer",
            description: "Max rows per list (default 10 for leaderboard, up to 100 when filtering).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dave_schultz_award_search",
      description:
        "Dave Schultz High School Excellence Award winners (NC). Use for 'Dave Schultz winners', 'who won Dave Schultz in [year]', or a wrestler/school name. Boys excellence award — not Tricia Saunders (girls).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "Optional athlete or high school name fragment.",
          },
          year: { type: "integer", description: "Optional award year." },
          limit: {
            type: "integer",
            description: "Max rows (default 50; use up to 500 for full list).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "tricia_saunders_award_search",
      description:
        "Tricia Saunders High School Excellence Award winners (NC girls). Use for 'Tricia Saunders winners', 'who won Tricia Saunders in [year]', or a wrestler/school name. Girls excellence award — not Dave Schultz (boys).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "Optional athlete or high school name fragment.",
          },
          year: { type: "integer", description: "Optional award year." },
          limit: {
            type: "integer",
            description: "Max rows (default 50; use up to 500 for full list).",
          },
        },
        required: [],
      },
    },
  },
]
