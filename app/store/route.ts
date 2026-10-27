import { NextRequest, NextResponse } from "next/server"

/**
 * NUCLEAR: GET /store is route-only (no React, no RSC stream).
 * Redirects to /store-app so the client never requests the React /store page (which was being canceled).
 * The real store UI lives at /store-app.
 */
export function GET(request: NextRequest) {
  // NC United's store; not on RecruitWrestlers (Matt's NC United sweep, 27 Oct 2026).
  if (/(^|\.)recruitwrestlers\.com$/i.test((request.headers.get("host") ?? "").split(":")[0])) {
    return NextResponse.redirect(new URL("/", request.url), 307)
  }
  return NextResponse.redirect(new URL("/store-app", request.url), 302)
}
