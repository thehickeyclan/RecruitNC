/**
 * Semantic Query Router
 * 
 * Uses vector embeddings to route queries to handlers based on semantic similarity.
 * This is an ADDITIVE feature - it doesn't replace existing routing, just adds a layer.
 * 
 * Feature flag: ENABLE_SEMANTIC_ROUTING=true to enable
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
// Use Voyage when key is set (works; no 429). Otherwise require explicit ENABLE_SEMANTIC_ROUTING=true for OpenAI.
const ENABLE_SEMANTIC_ROUTING =
  !!VOYAGE_API_KEY || process.env.ENABLE_SEMANTIC_ROUTING === "true"
const USE_VOYAGE = !!VOYAGE_API_KEY

// Handler examples - these will be embedded and used for similarity matching
// Add more examples as you discover successful query patterns
const HANDLER_EXAMPLES: Record<string, string[]> = {
  "unc_ncstate_rivalry": [
    "what is the rivalry match?",
    "what is the rivalry?",
    "who won last year's rivalry match?",
    "who won the rivalry match in 2025?",
    "who has the longest winning streak in the rivalry?",
    "when was the last time UNC beat NC State?",
    "when was the last time NC State beat UNC?",
    "what is UNC's record against NC State?",
    "what is NC State's record against UNC?",
    "who won the rivalry?",
    "rivalry match history",
    "UNC vs NC State wrestling",
    "show rivalry match results by year",
    "show all rivalry results",
    "show all rivalry matches",
    "rivalry results by year",
    "rivalry match results by season",
  ],
  "dual_team": [
    // NCHSAA Dual State Tournament (State Duals) queries
    "which school has the most state dual championships?",
    "what high school has the most state dual championships?",
    "what high school has the most dual team championships?",
    "which school has the most dual championships?",
    "who has the most nchsaa state dual titles?",
    "who has the most state dual titles?",
    "what team has the most state dual championships?",
    "who has the most dual team titles?",
    "who has the most state dual team championships?",
    "who is the best nc wrestling program of all time?",
    "how many state dual titles does bandys have?",
    "which teams dominated the 2000s?",
    "who won state duals in 2014 2a?",
    "who won dual state in 2014 2a?",
    "has any program won both duals and individual team titles in the same year?",
    "who won nc state duals in 2009?",
    "show me the 4a state dual bracket from 2018",
    "best dual team vs best tournament team?",
    "which program has more state titles, pisgah or uwharrie?",
    "is bandys better than west wilkes all time?",
    "who won dual team state?",
    "dual team champions",
    "dual team state championship",
    "who won dual team in 2025?",
    // Note: "NHSCA Dual championships" queries will route here
    // The handler will clarify that NHSCA Duals (Memorial Day weekend) is different from State Duals
  ],
  "nhsca_national_champion": [
    // NHSCA Individual Tournament (High School Nationals) queries
    "who are NHSCA national champions?",
    "NHSCA champions",
    "who won NHSCA nationals?",
    "who won nhsca's?",
    "who won nhscas?",
    "who won high school nationals?",
    "who won nationals?",
    "nhsca national champions",
    // Note: These are INDIVIDUAL champions from NHSCA High School Nationals
    // DO NOT route "NHSCA Dual championships" here - that's team duals (Memorial Day weekend)
  ],
  "state_champion_records": [
    // NCHSAA Individual Tournament (State Tournament/States) - Athlete-specific queries
    "who are the 4x state champions?",
    "who are the 4x state champs?",
    "four time state champions nc",
    "list all three time state champions",
    "how many 4x state champs are there?",
    "how many state titles does evan wick have?",
    "what year did faith bane win her first state championship?",
    "did trent allen place at states?",
    "did trent allen place at state tournament?",
    "show me drake maye's wrestling history",
    "who did bentley sly lose to at southeast open?",
    "how many matches did ayden white wrestle at state?",
    "was kenley riley a state placer?",
    "who is lorenzo alston?",
    "lorenzo alston",
    "show me all state championships for [name]",
    "what did [name] do at states?",
    "what did [name] do at state tournament?",
    "did [name] win state?",
    "how many state titles has [name] won?",
  ],
  "state_school_stats": [
    "which school produced the most state champs?",
    "which school has the most mow winners?",
    "what high schools produce the most college wrestlers?",
    "best nc wrestling program",
    "top wrestling schools in nc",
    "most successful wrestling programs",
  ],
  "nhsca_all_american": [
    // NHSCA Individual Tournament (High School Nationals) - All-American queries
    "did trent allen place at nhsca?",
    "did lorenzo alston place at nhsca?",
    "did [name] place at nhsca?",
    "was [name] a nhsca all american?",
    "is [name] a nhsca all american?",
    "who from north carolina placed at nhsca?",
    "show me all nhsca all americans",
    "nhsca all americans from nc",
    "who placed at nhsca nationals?",
    "did [name] place at nhsca nationals?",
    "did [name] place at nhsca's?",
    "did [name] place at nhscas?",
    "did [name] place at high school nationals?",
    "did [name] place at nationals?",
  ],
  "nhsca_all_american_count": [
    "when did we have the most nhsca all americans?",
    "which year had the most nhsca all americans?",
    "how many nhsca all americans in 2024?",
    "most nhsca all americans by year",
    "what year had the most nhsca all americans?",
    "nhsca all american count by year",
  ],
  "super32_all_american": [
    "how many nc wrestlers placed at super 32 in 2023?",
    "who from nc placed at super32?",
    "super32 all americans",
    "show me super32 results",
    "is bentley sly a super32 all american?",
    "was bentley sly a super32 all american?",
    "did bentley sly place at super32?",
    "is [name] a super32 all american?",
    "was [name] a super32 all american?",
    "did [name] place at super32?",
  ],
  "super32_winning_records": [
    "who had winning records at super32 in 2025?",
    "who had winning records at super32?",
    "winning records at super32",
    "super32 winning records",
    "who had winning records at super 32?",
    "super 32 winning records",
    "who had winning records at super32 in 2024?",
    "show me winning records at super32",
    "who had winning records at super32 in 2023?",
  ],
  "calendar": [
    // Tournament/Event queries - natural language variations
    "when are nhsca duals?",
    "when is nhsca duals?",
    "when is the next rivalry match?",
    "when is the next nc united practice?",
    "when are states?",
    "when is super32?",
    "when are aau scholastic duals?",
    "what is the schedule for girls states?",
    "what is the schedule for thursday at states?",
    "when is state duals?",
    "when are state championships?",
  ],
  "prospect_rankings": [
    "who are the top prospects for class of 2026?",
    "who are the top 10 kids in 2026?",
    "who are the top 20 prospects for 2027?",
    "show me the top prospects for class of 2026",
    "top 5 prospects 2026",
    "top prospects class of 2027",
    "who are the top kids in 2026?",
    "who are the top kids in 2027?",
    "top ranked prospects 2026",
    "top ranked prospects 2027",
    "best prospects class of 2026",
    "best prospects class of 2027",
    "what is john smith ranked?",
    "what is john smith's ranking?",
    "john smith ranked",
    "john smith ranking",
    "what rank is john smith?",
    "show me all ranked class of 2026",
    "all ranked prospects 2026",
    "all ranked class of 2027",
    "show all ranked 2026",
    "all ranked 2027",
  ],
  // Note: MOW, wrestler history, recruiting, and comparison queries
  // are handled by LLM classification but semantic routing can help identify intent
  // These will be learned automatically via learnFromQuery
}

/**
 * Generate embedding for text. Uses Voyage when VOYAGE_API_KEY is set (avoids OpenAI 429), else OpenAI.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (USE_VOYAGE && VOYAGE_API_KEY) {
    try {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "voyage-3.5",
          input: text,
          input_type: "query",
        }),
      })
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(`Voyage embedding error (status ${response.status}): ${errText || "unknown"}`)
      }
      const data = (await response.json()) as { data: Array<{ embedding: number[] }> }
      return data.data[0].embedding
    } catch (err: any) {
      console.error("[SemanticRouter] Voyage embedding error:", err)
      throw err
    }
  }

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured (set VOYAGE_API_KEY or OPENAI_API_KEY)")
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(`OpenAI embedding error (status ${response.status}): ${errorText || "unknown error"}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (err: any) {
    console.error("[SemanticRouter] Error generating embedding:", err)
    throw err
  }
}

/**
 * Initialize handler examples in embeddings table
 * Run this once to seed the semantic routing system
 */
export async function initializeSemanticRouting(): Promise<void> {
  if (!ENABLE_SEMANTIC_ROUTING) {
    console.log("[SemanticRouter] Semantic routing is disabled")
    return
  }

  const supabase = getSupabaseAdmin()
  const table = USE_VOYAGE ? "handler_pattern_embeddings" : "embeddings"
  console.log(`[SemanticRouter] Initializing handler examples (${USE_VOYAGE ? "Voyage" : "OpenAI"}) into ${table}...`)

  for (const [handlerName, examples] of Object.entries(HANDLER_EXAMPLES)) {
    for (const example of examples) {
      try {
        const contentId = `${handlerName}:${example}`
        const { data: existing } = await supabase
          .from(table)
          .select("id")
          .eq("content_type", "handler_pattern")
          .eq("content_id", contentId)
          .maybeSingle()

        if (existing) {
          console.log(`[SemanticRouter] Skipping existing: ${handlerName} - "${example}"`)
          continue
        }

        console.log(`[SemanticRouter] Generating embedding for: ${handlerName} - "${example}"`)
        const embedding = await generateEmbedding(example)

        const { error } = await supabase.from(table).insert({
          content_type: "handler_pattern",
          content_id: contentId,
          content_text: example,
          embedding,
          metadata: { handler_name: handlerName, example_query: example },
        })

        if (error) {
          console.error(`[SemanticRouter] Error storing embedding for ${handlerName}:`, error)
        } else {
          console.log(`[SemanticRouter] ✓ Stored: ${handlerName} - "${example}"`)
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (err: any) {
        console.error(`[SemanticRouter] Error processing ${handlerName} example "${example}":`, err)
      }
    }
  }

  console.log("[SemanticRouter] Initialization complete")
}

/**
 * Route query using semantic similarity
 * Returns handler name if match found, null otherwise
 */
export async function routeQuerySemantically(query: string): Promise<string | null> {
  if (!ENABLE_SEMANTIC_ROUTING) {
    return null
  }

  try {
    const supabase = getSupabaseAdmin()

    const queryEmbedding = await generateEmbedding(query)

    if (USE_VOYAGE) {
      const { data, error } = await supabase.rpc("match_handler_pattern_embeddings", {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 1,
      })
      if (error) {
        console.error("[SemanticRouter] Voyage similarity search error:", error)
        return null
      }
      if (data && data.length > 0 && data[0].similarity >= 0.75) {
        const handlerName = data[0].metadata?.handler_name
        console.log(`[SemanticRouter] Matched "${query}" → ${handlerName} (similarity: ${data[0].similarity.toFixed(3)})`)
        return handlerName
      }
      return null
    }

    const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      content_type_filter: "handler_pattern",
      match_threshold: 0.75,
      match_count: 1,
    })

    if (error) {
      console.error("[SemanticRouter] Error in similarity search:", error)
      return null
    }

    if (data && data.length > 0 && data[0].similarity >= 0.75) {
      const handlerName = data[0].metadata?.handler_name
      console.log(`[SemanticRouter] Matched "${query}" → ${handlerName} (similarity: ${data[0].similarity.toFixed(3)})`)
      return handlerName
    }

    return null
  } catch (err: any) {
    // Fail silently - don't break existing routing
    console.warn("[SemanticRouter] Semantic routing failed, falling back:", err?.message || err)
    return null
  }
}

/**
 * Add a successful query → handler mapping to improve routing
 * Call this when a query is successfully handled to learn patterns
 */
export async function learnFromQuery(query: string, handlerName: string): Promise<void> {
  if (!ENABLE_SEMANTIC_ROUTING) {
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    const contentId = `${handlerName}:${query}`

    if (USE_VOYAGE) {
      const { data: existing } = await supabase
        .from("handler_pattern_embeddings")
        .select("id")
        .eq("content_id", contentId)
        .maybeSingle()
      if (existing) return

      const embedding = await generateEmbedding(query)
      const { error } = await supabase.from("handler_pattern_embeddings").insert({
        content_type: "handler_pattern",
        content_id: contentId,
        content_text: query,
        embedding,
        metadata: { handler_name: handlerName, example_query: query, learned_from_usage: true },
      })
      if (error) console.warn("[SemanticRouter] Failed to learn from query:", error)
      else console.log("[SemanticRouter] Learned: \"" + query + "\" → " + handlerName)
      return
    }

    const { data: existing } = await supabase
      .from("embeddings")
      .select("id")
      .eq("content_type", "handler_pattern")
      .eq("content_id", contentId)
      .maybeSingle()

    if (existing) return

    const embedding = await generateEmbedding(query)
    const { error } = await supabase.from("embeddings").insert({
      content_type: "handler_pattern",
      content_id: contentId,
      content_text: query,
      embedding,
      metadata: { handler_name: handlerName, example_query: query, learned_from_usage: true },
    })

    if (error) console.warn("[SemanticRouter] Failed to learn from query:", error)
    else console.log("[SemanticRouter] Learned: \"" + query + "\" → " + handlerName)
  } catch (err: any) {
    console.warn("[SemanticRouter] Learning failed:", err?.message || err)
  }
}
