import { NextRequest, NextResponse } from "next/server"

/**
 * Bulletproof Store entry: plain redirect, no RSC, no layout JS.
 * Navbar and other links point here so the first request is a simple 302;
 * the browser then does a fresh GET to /store, avoiding canceled RSC/document requests.
 */
export function GET(request: NextRequest) {
  const url = new URL("/store-app", request.url)
  return NextResponse.redirect(url, 302)
}
