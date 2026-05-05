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
        "Find athletes in RecruitNC by name or high school (includes alumni / any graduation year — not limited to recent classes). Handles natural phrasing ('tell me about…', 'who is…') and minor misspellings server-side. Pass the person's name (or best guess); do not repeat filler words. If no row matches, the person may not be in the directory (e.g. some coaches or pre-digital-era alumni); do not assume a grad-year cutoff.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description:
              "Athlete name and/or school fragment (e.g. 'Jane Smith', 'Jacob Perry Cardinal Gibbons'). Include school when the user named it — disambiguates duplicate names. Min 2 meaningful characters after stripping chat phrases.",
          },
          limit: { type: "integer", description: "Max rows (default 20, max 40)." },
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
        "**Use together with `search_athletes` for any named wrestler.** One round trip across all major historical tables (1990s–present): NCHSAA individual state `wrestling_nchsaa_results`, NHSCA nationals `nhsca_placements` + legacy `wrestling_nhsca_results`, Super32 `super32_results`, and NC United national-team roster `nc_united_wrestlers` (NHSCA Duals / UCD roster context — not NCHSAA **state** dual team champions). Returns separate arrays per source so alumni appear even without an `athletes` directory row. For NCHSAA **state dual team** school winners by year use `nchsaa_dual_team_champions`. For a full merged markdown profile when you have a UUID, still call `get_athlete_full_dossier`.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            description: "Wrestler name and/or school fragment (same style as search_athletes).",
          },
          limit: { type: "integer", description: "Max rows per underlying table (default ~32, max 50)." },
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
        "FULL athlete report (legacy Data Dawg format): NCHSAA, duals, Super32, NHSCA, NC United, Dave Schultz, career record — same data path as unified profile. Call AFTER search_athletes (and use wrestling_cross_store_search for extra historical rows) whenever answering about a specific athlete by name. Required for 'tell me about [name]' when you have their UUID; do not substitute narrative bio text from other fields.",
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
        "FULL school wrestling report: NCHSAA individual (champions + other placers), dual team state titles, NHSCA nationals (wrestling_nhsca_results + nhsca_placements), Super32 All-Americans (top 8), Dave Schultz award winners, NCHSAA tournament MOW — plus classification when available. Use when the message is mainly a school name or asks about that school's wrestling history, champs, duals, nationals, or All-Americans. Pass the school name only.",
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
        "NCHSAA **state** dual team championships (state duals / dual team state champions): winners by year and division from table dual_team_champions. Use for 'show dual team state champions', 'NCHSAA dual team', 'who won state duals', **'who won dual team states in 2026'** (always pass year: 2026 as integer), 'dual team winners in [year]', or 'which school has the most dual team titles' (set leaderboard: true). Always call this tool for a specific year—never claim 'no records' without it. Optional filters: year (integer), division (e.g. '4A', '1A/2A'), school (champion school name fragment). Excludes vacated titles, placeholder rows, and tournaments marked not held. NOT the same as NHSCA national duals — if the user asks only for NHSCA duals, clarify; for NC state duals use this tool.",
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
              "If true, return schools ranked by total state dual titles (with years). Use for 'most dual team championships', 'dual team leaderboard'.",
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
        "NHSCA national tournament placements (athlete or school). Use for All-Americans, national placers, NHSCA history.",
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
        "NCHSAA individual state tournament results (placers/champions) by wrestler or school name fragment. Do NOT use for 'who are the 2x/3x/4x state champs' — use nchsaa_multi_time_state_champions instead.",
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
        "List ALL North Carolina wrestlers who won exactly N individual NCHSAA state championships (place=1), for N = 2, 3, or 4. Use for questions like 'who are the four-time state champions?', '4x state champs', 'three-time state champs', 'how many 4x champs' (call with times=4 then cite total_wrestlers). Does not require a wrestler name.",
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
]
