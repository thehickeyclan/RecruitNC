import { redirect } from "next/navigation"

/**
 * Retired in favour of /admin/rankings/board.
 *
 * There were four ranking screens across two paths, all editing the same prospect_ranking column
 * with different rules and different amounts of evidence on screen. Which one you happened to
 * open decided what you could see while making the call. The board is the one that shows the
 * score, the breakdown and the evidence behind it, so it is the one that survives.
 */
export default function RetiredProspectRankingPage() {
  redirect("/admin/rankings/board")
}
