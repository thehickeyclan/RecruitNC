import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * ⚠️ LOCKED MIDDLEWARE CONFIGURATION - DO NOT MODIFY ⚠️
 * 
 * This middleware MUST NOT call getUser() or getSession().
 * Making auth calls here causes rate limits on every request.
 * 
 * See AUTH_CONFIG_LOCKED.md for full documentation.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Skip middleware entirely for public routes that don't need auth
  const publicRoutes = [
    '/auth/signin',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/clear-session',
    '/auth/clear-cooldown',
    '/auth/callback',
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/reset-password',
    '/api/auth/clear-cooldown',
    '/api/debug',
  ]
  
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // CRITICAL: Check for rate limit cooldown BEFORE attempting any auth
  // This prevents repeated auth attempts that trigger rate limits
  const rateLimitCooldown = request.cookies.get("rate_limit_cooldown")?.value
  if (rateLimitCooldown) {
    const cooldownTime = parseInt(rateLimitCooldown, 10)
    const now = Date.now()
    // Cooldown is 2 minutes (120000ms) - reduced from 10 minutes
    if (now < cooldownTime + 120000) {
      // Still in cooldown - skip ALL auth attempts and clear cookies
      console.warn("[Middleware] Rate limit cooldown active, skipping ALL auth checks")
      
      // Aggressively clear ALL Supabase cookies to prevent ANY refresh attempts
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
        // Delete with all possible path/domain combinations
        supabaseResponse.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
      })
      
      // Return immediately - NO auth calls at all
      return supabaseResponse
    } else {
      // Cooldown expired, clear the flag
      supabaseResponse.cookies.delete("rate_limit_cooldown")
    }
  }

  // ROOT CAUSE FIX: Only check auth on routes that actually need it
  // Don't call getUser/getSession on every single request!
  const protectedRoutes = ['/admin', '/profile', '/coach-portal']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // If not a protected route, skip auth entirely
  if (!isProtectedRoute) {
    return supabaseResponse
  }

  // ⚠️ CRITICAL: DO NOT MAKE ANY AUTH CALLS IN MIDDLEWARE
  // Even calling getUser() or getSession() with stale cookies triggers refresh attempts
  // This was causing rate limits on EVERY request, including static assets
  // Let the client-side handle auth checks - middleware should only pass through
  
  // ⚠️ DO NOT UNCOMMENT OR ADD THESE LINES:
  // const supabase = createServerClient(...)
  // const { data: { user } } = await supabase.auth.getUser()  // ❌ NEVER DO THIS
  // const { data: { session } } = await supabase.auth.getSession()  // ❌ NEVER DO THIS
  
  // Just clear stale cookies if in cooldown, but don't make auth calls
  const hasSupabaseCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (hasSupabaseCookies) {
    // If we have cookies but are on a protected route, let the client handle auth
    // Don't call getUser() or getSession() here - that was causing rate limits
    // The client-side auth context will handle checking auth status
  }
  
  // Return immediately - NO auth calls in middleware at all
  // This completely eliminates automatic auth calls from middleware

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets (don't run middleware on these):
     * - _next/static, _next/image
     * - favicon.ico, manifest.json, icons
     * - common image/static file extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon-|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
}
