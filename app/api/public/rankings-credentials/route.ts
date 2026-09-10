import { NextResponse } from "next/server"

import { loadCredentialsForYear } from "@/lib/rankings/public-rankings-credentials"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

/** Thin HTTP wrapper. The read model, and the reasoning behind it, live in the lib module. */
export const revalidate = 3600

export async function GET(request: Request) {
  const year = Number(new URL(request.url).searchParams.get("year"))
  if (!Number.isInteger(year) || !isPublicRankingsYearPublished(year)) {
    // Same answer for "not a year" and "not published yet": an unpublished class must not be
    // distinguishable from a nonexistent one, or the endpoint reports when a class is coming.
    return NextResponse.json({ error: "No published ranking for that class." }, { status: 404 })
  }
  return NextResponse.json(await loadCredentialsForYear(year))
}
