import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
function isRateLimited(identifier: string): boolean {
  const now = Date.now()
  const windowMs = 60_000
  const maxRequests = 3
  const existing = rateLimitMap.get(identifier)
  if (!existing) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return false
  }
  if (now > existing.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return false
  }
  if (existing.count >= maxRequests) return true
  existing.count++
  return false
}

export async function POST(req: NextRequest) {
  try {
    const { athleteId } = await req.json()

    // Basic rate limit per IP
    const clientIP =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      // @ts-expect-error - Next's NextRequest may expose ip depending on runtime
      (req as any).ip ||
      "unknown"

    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a minute before trying again.",
          retryAfter: 60,
        },
        { status: 429 },
      )
    }

    // Use auth-helpers to read/write Supabase cookies correctly in route handlers
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          debug: { userError: userError?.message ?? null, hasUser: !!user },
        },
        { status: 401 },
      )
    }

    // Ensure athlete exists and not already claimed
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name, claimed_by_user_id")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        {
          error: "Athlete profile not found",
          debug: { athleteId, athleteError: athleteError?.message ?? null },
        },
        { status: 404 },
      )
    }

    if (athlete.claimed_by_user_id) {
      return NextResponse.json(
        {
          error: "Profile already claimed by another user",
          debug: {
            athleteName: athlete.name,
            claimedByUserId: athlete.claimed_by_user_id,
          },
        },
        { status: 400 },
      )
    }

    // Update athlete to link to current user
    const { error: updateError } = await supabase
      .from("athletes")
      .update({
        claimed_by_user_id: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", athleteId)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to claim profile", debug: { updateError: updateError.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Profile claimed successfully! Please verify your information below.",
      athleteId,
      athleteName: athlete.name,
      userId: user.id,
      nextStep: "verification",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        debug: { exception: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500 },
    )
  }
}
