/**
 * AI Agent - Handles queries that don't match any handler
 * Uses schema context and tools to generate and execute queries
 */

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { callChat } from "@/lib/ai-chat"

// Allowed tables for AI agent queries
const ALLOWED_TABLES = [
  "athletes",
  "matches",
  "wrestling_nchsaa_results",
  "nhsca_placements",
  "wrestling_nhsca_results",
  "school_classifications",
  "dual_team_champions",
  "dave_schultz_award"
]

// Database schema context
const SCHEMA_CONTEXT = `
You are Data Dawg, an AI assistant for NC wrestling data.

DATABASE SCHEMA:

Core Tables:
- athletes: {id, first_name, last_name, highschool, grad_year, college, division, ...}
- matches: {id, athlete_id, season, wins, losses, pins, tech_falls, decisions, major_decisions, ...}
- wrestling_nchsaa_results: {wrestler_name, place, year, classification, weight_class, school}
- nhsca_placements: {athlete_name, placement, year, division, weight_class, high_school}
- wrestling_nhsca_results: {athlete_name, placement, year, division, weight, high_school}
- school_classifications: {school_name, classification, region, effective_year}
- dual_team_champions: {school, year, classification}
- dave_schultz_award: {athlete_name, year, school}

Common Query Patterns:
- State placements: Filter wrestling_nchsaa_results WHERE year=X AND classification=Y AND weight_class=Z
- Career records: Aggregate matches by athlete_id, group by season
- College commitments: Filter athletes WHERE college IS NOT NULL AND grad_year=X
- NHSCA results: Query nhsca_placements OR wrestling_nhsca_results (both exist)

IMPORTANT RULES:
- Takedown = 3 points (NOT 2)
- Near fall max = 4 points (NOT 5)
- High school periods = 2 minutes
- Use school_classifications table for current divisions (not historical data from wrestling_nchsaa_results)
- For name matching, use fuzzy matching (ilike with %pattern%)
`

export interface AgentContext {
  message: string
  conversationHistory?: any[]
  messageId?: string
  detectedProject?: string
  availableHandlers?: string[]
}

export class AIAgent {
  async process(context: AgentContext): Promise<NextResponse> {
    try {
      // Step 1: AI interprets intent and generates query plan
      const systemPrompt = `${SCHEMA_CONTEXT}

Available handlers: ${context.availableHandlers?.join(", ") || "none"}

If the query matches a handler pattern, suggest using that handler.
Otherwise, analyze the query and determine what data is needed.

For database queries, use these patterns:
- State results: wrestling_nchsaa_results table
- NHSCA results: nhsca_placements OR wrestling_nhsca_results
- Career records: matches table, aggregate by season
- School info: school_classifications table
- College commitments: athletes table, filter by college IS NOT NULL`

      const aiResponse = await callChat({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(context.conversationHistory || []),
          { role: "user", content: context.message }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      const content = aiResponse.choices?.[0]?.message?.content?.trim()
      
      if (!content) {
        throw new Error("AI agent returned empty response")
      }

      // Step 2: Extract query intent from AI response
      // For now, let AI generate the answer directly
      // In future, we can add tool calling for complex queries

      return NextResponse.json({
        answer: content,
        messageId: context.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "ai_agent",
        source: "ai_agent"
      })

    } catch (error: any) {
      console.error("[AI Agent] Error:", error)
      
      // Fallback: Return helpful error message
      return NextResponse.json({
        answer: "I'm having trouble processing that query right now. Could you try rephrasing it?",
        messageId: context.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        queryType: "ai_agent_error",
        error: error.message
      })
    }
  }

  /**
   * Execute a safe database query (future enhancement)
   */
  private async executeSafeQuery(table: string, filters: Record<string, any>, limit: number = 100) {
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error(`Table ${table} is not allowed`)
    }

    const adminClient = getSupabaseAdmin()
    let query = adminClient.from(table).select("*")

    // Apply filters safely
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (typeof value === "string") {
        query = query.ilike(key, `%${value}%`)
      } else {
        query = query.eq(key, value)
      }
    })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Query failed: ${error.message}`)
    }

    return data
  }
}

// Export singleton instance
export const aiAgent = new AIAgent()

