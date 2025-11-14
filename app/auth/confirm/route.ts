import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("[v0] ===== AUTH CONFIRM ROUTE CALLED =====")
  console.log("[v0] Confirm route URL:", request.url)

  const { searchParams } = new URL(request.url)

  console.log("[v0] Confirm route params:", {
    hasCode: searchParams.has("code"),
    hasToken: searchParams.has("token"),
    allParams: Array.from(searchParams.entries()),
  })

  // Forward all query parameters to the callback route
  const callbackUrl = new URL("/auth/callback", request.url)
  searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value)
  })

  console.log("[v0] Redirecting to callback:", callbackUrl.toString())

  return NextResponse.redirect(callbackUrl)
}
