/**
 * Enhanced Handler Registry with Priority and Matching
 * 
 * Handlers are checked in priority order. Higher priority = checked first.
 * If no handler matches, query falls through to AI agent.
 */

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/server-supabase"

export interface HandlerResult {
  answer?: string
  results?: any[]
  queryType?: string
  messageId?: string
  bypassAI?: boolean // If true, return immediately without AI formatting
}

export interface QueryContext {
  message: string
  lowerQuestion: string
  conversationHistory?: any[]
  messageId?: string
  detectedProject?: string
}

export interface Handler {
  name: string
  priority: number // Higher = checked first (100 = critical, 50 = common, 10 = edge cases)
  match: (query: string, lowerQuery: string) => boolean
  execute: (context: QueryContext) => Promise<HandlerResult | null>
  cacheable?: boolean
  description?: string
}

// Create handlers array directly (no lazy initialization to avoid circular deps)
function createHandlers(): Handler[] {
  const handlers: Handler[] = []

  // Critical pre-filters (bypass everything, highest priority)
  handlers.push({
    name: "takedown_points",
    priority: 100,
    description: "Answer takedown points question (critical rule)",
    match: (query, lowerQuery) => /how many points.*takedown|takedown.*points/i.test(lowerQuery),
    execute: async () => ({
      answer: "Great question! A takedown in wrestling is worth **3 points**.",
      bypassAI: true
    })
  })

  handlers.push({
    name: "near_fall_points",
    priority: 100,
    description: "Answer near fall points question (critical rule)",
    match: (query, lowerQuery) => /how many points.*near fall|near fall.*points|nearfall.*points/i.test(lowerQuery),
    execute: async () => ({
      answer: "Great question! Near fall points can be 2, 3, or 4 points, with a maximum of **4 points**.",
      bypassAI: true
    })
  })

  // High priority handlers (common queries)
  handlers.push({
    name: "state_placement",
    priority: 80,
    description: "State placement queries (who won/placed at states)",
    match: (query, lowerQuery) => {
      const hasState = lowerQuery.includes("states") || lowerQuery.includes("state") || lowerQuery.includes("nchsaa") || lowerQuery.includes("regional") || lowerQuery.includes("regionals") || (lowerQuery.includes("show") && lowerQuery.match(/\d+[aA]/))
      const hasPlacerOrQualifier = lowerQuery.includes("who won") || lowerQuery.includes("who took") ||
        lowerQuery.includes("all state placers") || lowerQuery.includes("all placers") ||
        lowerQuery.includes("who placed") || lowerQuery.includes("state placers") ||
        lowerQuery.includes("state qualifier") || lowerQuery.includes("state qualifiers") ||
        (lowerQuery.includes("show") && (lowerQuery.includes("all placers") || lowerQuery.includes("state placers") || lowerQuery.includes("qualifiers"))) ||
        (lowerQuery.includes("list") && (lowerQuery.includes("placers") || lowerQuery.includes("champions") || lowerQuery.includes("qualifiers")))
      const hasContext = lowerQuery.match(/\d+[a-z]{1,3}/) || lowerQuery.match(/\d+lbs/) || lowerQuery.match(/\d+lb/) || lowerQuery.match(/\d+[aA]\s+states/) || lowerQuery.match(/\b(20\d{2})\b/)
      return !!(hasState && hasPlacerOrQualifier && hasContext)
    },
    execute: async (context) => {
      // Import and use existing state placement handler
      const { handleStatePlacement } = await import("./handlers/state-placement")
      return await handleStatePlacement(context)
    }
  })

  handlers.push({
    name: "career_record",
    priority: 70,
    description: "Career/high school record queries",
    match: (query, lowerQuery) => {
      return /(career|high school).*record|.*record.*high school|.*high school.*career.*record/i.test(lowerQuery)
    },
    execute: async (context) => {
      // Import and use existing match record handler
      const { handleMatchRecord } = await import("./handlers/match-record")
      return await handleMatchRecord(context)
    }
  })

  handlers.push({
    name: "college_commitment",
    priority: 60,
    description: "College commitment queries",
    match: (query, lowerQuery) => {
      return /committed to|commitment|commits to|who.*committed|division.*commitments/i.test(lowerQuery)
    },
    execute: async (context) => {
      // Import and use existing college handler
      const { handleCollegeQuery } = await import("./handlers/college-commitment")
      return await handleCollegeQuery(context)
    }
  })

  handlers.push({
    name: "high_school_query",
    priority: 65,
    description: "What high school did [wrestler] go to",
    match: (query, lowerQuery) => {
      return /what high school.*go to|what high school.*attend|high school.*did.*go/i.test(lowerQuery)
    },
    execute: async (context) => {
      // Import and use existing high school handler
      const { handleHighSchoolQuery } = await import("./handlers/high-school")
      return await handleHighSchoolQuery(context)
    }
  })

  // Sort by priority (highest first)
  handlers.sort((a, b) => b.priority - a.priority)

  return handlers
}

// Cache the handlers array
let cachedHandlers: Handler[] | null = null

// Find matching handler
export function findHandler(query: string, lowerQuery: string): Handler | null {
  if (!cachedHandlers) {
    cachedHandlers = createHandlers()
  }
  return cachedHandlers.find(h => h.match(query, lowerQuery)) || null
}

// Get all handlers (for debugging/monitoring)
export function getAllHandlers(): Handler[] {
  if (!cachedHandlers) {
    cachedHandlers = createHandlers()
  }
  return [...cachedHandlers]
}
