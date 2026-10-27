import { NextRequest, NextResponse } from "next/server"

/**
 * Bulletproof Store entry: plain redirect, no RSC, no layout JS.
 * Navbar and other links point here so the first request is a simple 302;
 * the browser then does a fresh GET to /store, avoiding canceled RSC/document requests.
 */
export function GET(request: NextRequest) {
  // NC United's store; not on RecruitWrestlers (Matt's NC United sweep, 27 Oct 2026).
  if (/(^|\.)recruitwrestlers\.com$/i.test((request.headers.get("host") ?? "").split(":")[0])) {
    return NextResponse.redirect(new URL("/", request.url), 307)
  }
  const url = new URL("/store-app", request.url)
  return NextResponse.redirect(url, 302)
}
