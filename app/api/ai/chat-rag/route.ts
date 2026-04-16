import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Semantic search function - called by AI
async function semanticSearch(query: string, contentType?: string, limit: number = 10) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  // Generate embedding for the query
  const embedResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
  })

  if (!embedResponse.ok) {
    throw new Error("Failed to generate embedding")
  }

  const embedData = await embedResponse.json()
  const queryEmbedding = embedData.data[0].embedding

  // Search for similar embeddings
  const adminClient = getSupabaseAdmin()
  const { data: results, error } = await adminClient.rpc("match_embeddings", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    content_type_filter: contentType || null,
  })

  if (error) {
    console.warn("Vector search error, using fallback:", error)
    // Fallback to manual search
    const { data: allEmbeddings } = await adminClient
      .from("embeddings")
      .select("*")
      .limit(limit * 3)

    if (!allEmbeddings) return []

    let filtered = allEmbeddings
    if (contentType) {
      filtered = filtered.filter((e: any) => e.content_type === contentType)
    }

    const withSimilarity = filtered.map((r: any) => {
      const similarity = cosineSimilarity(queryEmbedding, r.embedding)
      return { ...r, similarity }
    })

    return withSimilarity
      .filter((r: any) => r.similarity >= 0.7)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  return results || []
}

// Safe SQL query function - called by AI
async function safeSqlQuery(sql: string, params?: Record<string, any>) {
  const adminClient = getSupabaseAdmin()
  
  // Security: Only allow SELECT queries
  const trimmedSql = sql.trim().toUpperCase()
  if (!trimmedSql.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed")
  }

  // Security: Block dangerous operations
  const dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE", "EXEC", "EXECUTE"]
  for (const keyword of dangerous) {
    if (trimmedSql.includes(keyword)) {
      throw new Error(`Operation ${keyword} is not allowed`)
    }
  }

  try {
    // Use Supabase's query builder for safety, or execute raw SQL if needed
    // For now, we'll parse simple SELECT queries and use Supabase client
    // This is a simplified version - in production, use a proper SQL parser
    
    // Extract table name (simplified - assumes "SELECT * FROM table_name")
    const tableMatch = sql.match(/FROM\s+(\w+)/i)
    if (!tableMatch) {
      throw new Error("Could not parse table name from SQL")
    }
    
    const tableName = tableMatch[1]
    
    // For now, return a message that SQL queries should use the query builder
    // In production, implement a proper SQL parser or use Supabase's query builder
    return {
      error: "Direct SQL execution not yet implemented. Use semantic_search for queries.",
      suggestion: "Try using semantic_search instead for this query."
    }
  } catch (error: any) {
    throw new Error(`SQL query error: ${error.message}`)
  }
}

// Database schema for AI
const DATABASE_SCHEMA = `
DATABASE SCHEMA:

1. wrestling_nchsaa_results
   - year (number) — includes 2026
   - classification (1A, 2A, 3A, 4A, 5A, 6A, 7A, 8A, 1A/2A)
   - weight_class (106, 113, 120, 132, etc.)
   - place: 0 = State Qualifier (SQ); 1 = champion; 2026+ placers = 1-4 only; earlier = 1-8
   - wrestler_name (string)
   - school (string)

2. wrestling_nhsca_results
   - year (number)
   - division (Freshman, Sophomore, Junior, Senior)
   - weight (number)
   - placement (1-8, where 1-8 are All-Americans)
   - athlete_name (string)
   - high_school (string)
   - state (string, usually "NC")

3. athletes
   - name (string)
   - firstName (string)
   - lastName (string)
   - highschool (string)
   - college (string, nullable)
   - graduationyear (number)
   - weightclass (string)
   - division (string, e.g., "NCAA DI")
   - commitment_date (date, nullable)

4. dual_team_champions
   - year (number)
   - division (1A, 2A, 3A, 4A, 1A/2A)
   - champion_school (string)
   - is_vacated (boolean)

5. tournament_champions
   - year (number)
   - division (1A, 2A, 3A, 4A, 1A/2A, or NULL)
   - champion_school (string)

6. dave_schultz_award
   - year (number)
   - name (string)
   - high_school (string)
   - college (string, nullable)

7. tricia_saunders_award
   - year (number)
   - name (string)
   - high_school (string)
   - college (string, nullable)

8. matches
   - first_name (string)
   - last_name (string)
   - high_school (string)
   - wins (number)
   - losses (number)
   - year (number)
   - opponent_name (string, nullable)

9. winningest_wrestlers
   - wrestler_name (string)
   - school (string)
   - record (string, e.g., "91-0")
   - wins (number)
   - losses (number)
   - year (string)

10. career_winningest_wrestlers
    - name (string)
    - school (string)
    - record (string, e.g., "284-6")
    - wins (number)
    - losses (number)
    - years (string)

11. record_books
    - category (string)
    - athlete_name (string)
    - school (string)
    - record_value (string)
`

const SYSTEM_PROMPT = `You are Data Dawg, a helpful AI assistant that answers questions about North Carolina high school wrestling data.

${DATABASE_SCHEMA}

AVAILABLE FUNCTIONS:
1. semantic_search(query, contentType?, limit?) - Use for fuzzy queries, name searches, misspellings
   - Best for: Finding specific athletes, schools, or results by name
   - Handles: Misspellings, name variations, partial matches
   - Returns: Relevant data with similarity scores

2. sql_query(sql) - Use for precise queries with exact criteria
   - Best for: Counting, aggregating, filtering by exact values
   - Security: Only SELECT queries allowed
   - Note: Currently use semantic_search instead

PRIVACY RESTRICTIONS:
- Do NOT provide GPA information
- Do NOT provide contact information (phone, email, address)
- Do NOT provide access to recruiting portals
- Only provide public wrestling data

HOW TO ANSWER QUESTIONS:
1. For name queries (e.g., "Where did Liam Hickey commit?") → Use semantic_search
2. For count queries (e.g., "How many All-Americans?") → Use semantic_search or query directly
3. For complex queries → Combine multiple semantic searches
4. Always cite your sources and be specific with numbers, names, and years

When you have the data, provide a clear, natural language answer.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = body.message || ""
    const detectedProject = body.project || "legacy-nc"
    const feedback = body.feedback || null
    const messageId = body.messageId || null
    const requestUrl = request.headers.get("referer") || ""

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const startTime = Date.now()
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ]

    // Function definitions for OpenAI
    const functions = [
      {
        name: "semantic_search",
        description: "Search for data using semantic similarity. Best for finding athletes, schools, or results by name. Handles misspellings and name variations.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'Liam Hickey college commitment', 'Cardinal Gibbons wrestlers')",
            },
            contentType: {
              type: "string",
              description: "Optional: Filter by content type ('athlete', 'school', 'result', etc.)",
              enum: ["athlete", "school", "result", "commitment", null],
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 10)",
              default: 10,
            },
          },
          required: ["query"],
        },
      },
    ]

    // First AI call - let it decide what functions to use
    let response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        functions,
        function_call: "auto", // Let AI decide
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenAI API error:", error)
      return NextResponse.json({ error: "Failed to process query" }, { status: 500 })
    }

    let responseData = await response.json()
    let assistantMessage = responseData.choices[0].message

    // Handle function calls
    while (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments || "{}")

      // Add assistant's function call to messages
      messages.push(assistantMessage)

      let functionResult: any

      try {
        if (functionName === "semantic_search") {
          const results = await semanticSearch(
            functionArgs.query,
            functionArgs.contentType,
            functionArgs.limit || 10
          )
          functionResult = {
            results: results.map((r: any) => ({
              content: r.content_text,
              metadata: r.metadata,
              similarity: r.similarity || 0,
            })),
            count: results.length,
          }
        } else {
          functionResult = { error: `Unknown function: ${functionName}` }
        }
      } catch (error: any) {
        functionResult = { error: error.message }
      }

      // Add function result to messages
      messages.push({
        role: "function",
        name: functionName,
        content: JSON.stringify(functionResult),
      })

      // Get AI's response to function result
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          functions,
          function_call: "auto",
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error("OpenAI API error:", error)
        break
      }

      responseData = await response.json()
      assistantMessage = responseData.choices[0].message
    }

    const answer = assistantMessage.content || "I couldn't generate a response."

    // Log query (non-blocking)
    try {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      const logClient = getSupabaseAdmin()
      const responseMessageId = messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      await logClient.from("ai_query_logs").insert({
        query: message,
        project: detectedProject,
        url: requestUrl,
        response: answer,
        query_type: "rag_function_calling",
        response_time_ms: responseTime,
        feedback: feedback || null,
        message_id: responseMessageId,
      })
    } catch (e) {
      console.warn("Query logging failed:", e)
    }

    return NextResponse.json({
      answer,
      messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })
  } catch (error: any) {
    console.error("AI chat error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}



