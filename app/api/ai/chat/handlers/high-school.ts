/**
 * High School Query Handler
 * Handles "what high school did [wrestler] go to"
 */

import { HandlerResult, QueryContext } from "../handler-registry"

export async function handleHighSchoolQuery(context: QueryContext): Promise<HandlerResult | null> {
  // For now, return null to fall through to existing logic
  return null
}

