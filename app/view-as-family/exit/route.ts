import { NextResponse, type NextRequest } from "next/server"

import { VIEW_AS_FAMILY_COOKIE } from "@/lib/view-as/cookie"

/** Stop viewing a family's Command Center. */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url))
  res.cookies.set(VIEW_AS_FAMILY_COOKIE, "", { path: "/", maxAge: 0 })
  return res
}
