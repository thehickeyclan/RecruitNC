import { NextRequest, NextResponse } from "next/server"

/**
 * NUCLEAR: GET /store is route-only (no React, no RSC stream).
 * Redirects to /store-app so the client never requests the React /store page (which was being canceled).
 * The real store UI lives at /store-app.
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/store-app", request.url), 302)
}
