import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Check if we're in a rate limit cooldown period
 * Returns true if in cooldown, false otherwise
 */
export async function isRateLimited(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const rateLimitCooldown = cookieStore.get("rate_limit_cooldown")?.value
    
    if (!rateLimitCooldown) {
      return false
    }
    
    const cooldownTime = parseInt(rateLimitCooldown, 10)
    const now = Date.now()
    
    // Cooldown is 2 minutes (120000ms) - reduced from 10 minutes
    if (cooldownTime && now < cooldownTime + 120000) {
      return true
    }
    
    return false
  } catch (error) {
    // If we can't check, assume not rate limited to avoid blocking
    return false
  }
}

/**
 * Wrapper for API routes that need auth
 * Checks rate limit cooldown BEFORE making any auth calls
 * Returns null if not rate limited, or a NextResponse with 429 if rate limited
 */
export async function checkRateLimitBeforeAuth(): Promise<NextResponse | null> {
  if (await isRateLimited()) {
    console.warn("[Rate Limit Check] Cooldown active, blocking auth call")
    return NextResponse.json(
      { 
        error: "Rate limit cooldown active. Please wait 2 minutes before trying again.",
        rateLimited: true
      },
      { status: 429 }
    )
  }
  return null
}

