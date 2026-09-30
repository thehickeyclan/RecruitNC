import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { loadPublicClassRanking } from "@/lib/rankings/public-rankings-view"
import { loadTopHundred } from "@/lib/rankings/top-100-view"
import {
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
  PUBLIC_TOP_75_COLLEGE_RELEASED,
} from "@/lib/public-rankings-cap"

/**
 * Every published board, for the app.
 *
 * The Rankings tab used to read `public_rankings` from the phone with the anon key. That key
 * ships inside every copy of the app, so the paywall was decorative — and nothing synced the
 * table, which is why it held no 2029 at all and 83 rows for a class published as a top 30.
 * Sending people to the website fixed the correctness and the gate in one go, but it is a
 * browser sat inside an app, and it is not what a ranking should feel like on a phone.
 *
 * So: one authenticated call, the same entitlement check the website runs, and the same loaders
 * that render the web boards. The phone gets data it could not have fetched for itself, and
 * there is one copy of the rule about who may read it.
 *
 * Everything in one response because the boards are small - 30, 30, 15 and 75 - and four round
 * trips on a phone network is four chances to show half a screen.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in to see the rankings." }, { status: 401 })
  }

  const admin = createAdminClient()
  const { viewer } = await resolveRankingViewerForUser({ admin, userId })

  if (!canSeeProspectRanking(viewer)) {
    /*
     * 403 rather than an empty list: the app needs to tell these two apart, because one is an
     * offer worth showing and the other is a bug. `subscribeUrl` is where the phone sends them.
     */
    return NextResponse.json(
      {
        ok: false,
        entitled: false,
        error: "Rankings are included with NC United Blue, or available by subscription.",
        subscribeUrl: "/rankings",
      },
      { status: 403 },
    )
  }

  const isAdmin = viewer.isAdmin === true
  const years = isAdmin
    ? [2027, 2028, 2029].filter((y) => PUBLISHED_PUBLIC_RANKINGS_YEARS.includes(y) || isAdmin)
    : [...PUBLISHED_PUBLIC_RANKINGS_YEARS]

  const classBoards = await Promise.all(
    years.map(async (year) => {
      const board = await loadPublicClassRanking(year, isAdmin)
      return {
        key: String(year),
        title: `Class of ${year}`,
        cap: board.cap,
        published: board.published,
        athletes: board.athletes,
      }
    }),
  )

  const boards = classBoards.filter((b) => b.published && b.athletes.length > 0)

  // The board that replaced the ranked list: classes of 2027 and 2028, past every class cut.
  if (isAdmin || PUBLIC_TOP_75_COLLEGE_RELEASED) {
    const college = await loadTopHundred("Male")
    if (college.published && college.athletes.length > 0) {
      boards.push({
        key: "college-prospects",
        title: `Top ${college.cap} College Prospects`,
        cap: college.cap,
        published: college.published,
        athletes: college.athletes,
      })
    }
  }

  /*
   * The Top 75 Ranked Prospects is retired and deliberately absent here, for admins too. On the
   * website an admin previewing an unreleased board is useful; in the app it just puts two lists
   * called "Top 75" in front of the person least able to tell them apart from a phone.
   */

  return NextResponse.json({ ok: true, entitled: true, boards })
}
