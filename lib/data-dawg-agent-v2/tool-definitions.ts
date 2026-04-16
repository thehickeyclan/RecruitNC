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
              "Athlete name and/or school fragment (e.g. 'Jane Smith', 'Smith', 'Cardinal Gibbons'). Min 2 meaningful characters after stripping chat phrases.",
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
        "FULL athlete report (legacy Data Dawg format): NCHSAA, duals, Super32, NHSCA, NC United, Dave Schultz, career record — same data path as unified profile. Call AFTER search_athletes when you have an athlete UUID from the search results. Required for 'tell me about [name]' / full bio questions.",
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
        "NCHSAA individual state tournament results (placers/champions) by wrestler or school name fragment.",
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
