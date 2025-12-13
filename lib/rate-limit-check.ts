import { cookies } from "next/headers"

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
    
    // Cooldown is 10 minutes (600000ms)
    if (cooldownTime && now < cooldownTime + 600000) {
      return true
    }
    
    return false
  } catch (error) {
    // If we can't check, assume not rate limited to avoid blocking
    return false
  }
}

