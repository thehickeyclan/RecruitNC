import { NextResponse } from "next/server"
import { RECRUITNC_APP_URL } from "@/lib/athlete-profile-links"
import type { QueryHandler } from "./index"

/**
 * Rankings are a paid product and are never available through Data Dawg.
 *
 * Keep this handler intentionally free of database access. Both legacy and v2
 * routing may send rankings questions here; every such request gets the same
 * access CTA without confirming a rank, a ranked athlete, or list availability.
 */
export const handleProspectRankings: QueryHandler = async (_params, _request, messageId) => ({
  directResponse: NextResponse.json({
    answer: `RecruitNC rankings aren’t available through Data Dawg. [Sign in or subscribe to rankings](${RECRUITNC_APP_URL}/rankings).`,
    messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    queryType: "prospect_rankings",
  }),
})
