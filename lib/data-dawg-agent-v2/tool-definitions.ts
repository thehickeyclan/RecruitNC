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
        "Find athletes in RecruitNC by name or high school. Handles natural phrasing ('tell me about…', 'who is…') and minor misspellings server-side. Pass the person's name (or best guess); do not repeat filler words.",
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
      name: "get_athlete_full_dossier",
      description:
        "FULL athlete report (legacy Data Dawg format): NCHSAA, duals, Super32, NHSCA, NC United, Dave Schultz, career record — same data path as unified profile. Call AFTER search_athletes whenever answering about a specific athlete by name. Required for 'tell me about [name]'; do not substitute narrative bio text from other fields.",
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
        "Find NC high schools: official classifications (1A–4A, region) plus schools seen on athlete rosters. Use for 'tell me about [school]', classification, region, or whether a school exists. Pass the school name only.",
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
