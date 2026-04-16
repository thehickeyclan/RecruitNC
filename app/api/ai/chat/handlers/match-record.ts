/**
 * Match Record Handler (Career/High School Records)
 * Handles queries like "what is liam hickey high school record"
 */

import { HandlerResult, QueryContext } from "../handler-registry"

export async function handleMatchRecord(context: QueryContext): Promise<HandlerResult | null> {
  // For now, return null to fall through to existing logic
  // This will be implemented by extracting the existing match record handler
  return null
}

