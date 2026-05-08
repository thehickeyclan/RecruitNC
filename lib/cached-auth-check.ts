import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isRateLimited } from "@/lib/rate-limit-check"

/**
 * Cached auth check to reduce Supabase API calls
 * Caches the result for 5 minutes to prevent excessive auth validation calls
 */
interface CachedAuthResult {
  user: any
  profile: any
  timestamp: number
}

// In-memory cache (cleared on server restart)
const authCache = new Map<string, CachedAuthResult>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached auth result or fetch new one
 * This reduces Supabase API calls by caching auth checks for 5 minutes
 */
export async function getCachedAuth(sessionId?: string): Promise<{
  user: any | null
  profile: any | null
  error: string | null
  cached: boolean
}> {
  // CRITICAL: Check rate limit cooldown BEFORE any auth calls
  if (await isRateLimited()) {
    console.warn("[Cached Auth] Rate limit cooldown active, skipping auth check")
    return {
      user: null,
      profile: null,
      error: "Rate limit cooldown active. Please wait 2 minutes.",
      cached: false
    }
  }

  // Try to get from cache first
  if (sessionId) {
    const cached = authCache.get(sessionId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("[Cached Auth] Using cached auth result")
      return {
        user: cached.user,
        profile: cached.profile,
        error: null,
        cached: true
      }
    }
  }

  // Cache miss or expired — validate with Auth server (not cookie-only session.user).
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        user: null,
        profile: null,
        error: userError?.message || "Not authenticated",
        cached: false,
      }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin, full_name, email, role")
      .eq("user_id", user.id)
      .single()

    const result = {
      user,
      profile: profile || null,
      error: profileError?.message || null,
      cached: false,
    }

    // Cache the result
    if (user.id) {
      authCache.set(user.id, {
        user,
        profile: profile || null,
        timestamp: Date.now(),
      })
      
      // Clean up old cache entries (keep cache size reasonable)
      if (authCache.size > 100) {
        const now = Date.now()
        for (const [key, value] of authCache.entries()) {
          if (now - value.timestamp > CACHE_TTL_MS) {
            authCache.delete(key)
          }
        }
      }
    }

    return result
  } catch (error: any) {
    console.error("[Cached Auth] Error:", error)
    return {
      user: null,
      profile: null,
      error: error.message || "Auth check failed",
      cached: false
    }
  }
}

/**
 * Check if user is admin (with caching)
 */
export async function getCachedAdminCheck(): Promise<{
  isAdmin: boolean
  user: any | null
  error: string | null
  response?: NextResponse
}> {
  const authResult = await getCachedAuth()

  if (authResult.error) {
    if (authResult.error.includes("Rate limit")) {
      return {
        isAdmin: false,
        user: null,
        error: authResult.error,
        response: NextResponse.json(
          { error: authResult.error },
          { status: 429 }
        )
      }
    }
    return {
      isAdmin: false,
      user: null,
      error: authResult.error,
      response: NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }
  }

  if (!authResult.user) {
    return {
      isAdmin: false,
      user: null,
      error: "Not authenticated",
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
  }

  const isAdmin = authResult.profile?.is_admin || false

  return {
    isAdmin,
    user: authResult.user,
    error: null
  }
}

/**
 * Session + profile for routes that check `profile?.is_admin` manually.
 */
export async function getAdminAuth(): Promise<{
  user: any | null
  profile: any | null
}> {
  const authResult = await getCachedAuth()
  if (authResult.error || !authResult.user) {
    return { user: null, profile: null }
  }
  return { user: authResult.user, profile: authResult.profile }
}

/**
 * Clear auth cache for a specific user (useful after logout or profile updates)
 */
export function clearAuthCache(userId: string) {
  authCache.delete(userId)
}

/**
 * Clear all auth cache
 */
export function clearAllAuthCache() {
  authCache.clear()
}

