import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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
    '/auth/callback',
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/reset-password',
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
    // Cooldown is 10 minutes (600000ms) - much longer than Supabase's 60 second limit
    if (now < cooldownTime + 600000) {
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

  // Check if we have any Supabase cookies - if not, skip auth entirely
  const hasSupabaseCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (!hasSupabaseCookies) {
    // No auth cookies, skip auth checks entirely
    return supabaseResponse
  }

  // ONLY create Supabase client if we're on a protected route AND have cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: "none",
              secure: true,
            }),
          )
        },
      },
    },
  )

  // IMPORTANT: Only call getUser/getSession on protected routes
  // This is the ROOT CAUSE - we were calling this on EVERY request!

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    // If we get a rate limit error, clear auth cookies, set cooldown, and skip session refresh
    if (userError && (
      userError.message?.includes("rate limit") || 
      userError.message?.includes("429") ||
      userError.message?.includes("Too many")
    )) {
      console.warn("[Middleware] Rate limit detected on getUser, clearing auth cookies and setting cooldown")
      
      // Clear all Supabase auth cookies
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
      
      // Set cooldown cookie (10 minutes) to prevent further attempts
      supabaseResponse.cookies.set("rate_limit_cooldown", Date.now().toString(), {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      })
      
      return supabaseResponse
    }

    // Only refresh session if we have a user - don't refresh on every request!
    // This was causing the rate limit - we were refreshing sessions unnecessarily
    if (user) {
      const { error: sessionError } = await supabase.auth.getSession()
      
      // If session refresh hits rate limit, clear cookies and set cooldown
      if (sessionError && (
        sessionError.message?.includes("rate limit") || 
        sessionError.message?.includes("429") ||
        sessionError.message?.includes("Too many")
      )) {
        console.warn("[Middleware] Rate limit detected on getSession, clearing auth cookies and setting cooldown")
        
        const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
        cookiesToClear.forEach(cookie => {
          supabaseResponse.cookies.delete(cookie.name)
        })
        
        supabaseResponse.cookies.set("rate_limit_cooldown", Date.now().toString(), {
          httpOnly: false,
          secure: true,
          sameSite: "lax",
          maxAge: 600,
          path: "/",
        })
      }
    }
    // If no user, don't call getSession() - this was the problem!
  } catch (error: any) {
    // If we catch a rate limit error, clear cookies, set cooldown, and continue
    const errorMsg = error?.message || error?.toString() || ""
    if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("Too many")) {
      console.warn("[Middleware] Rate limit exception caught, clearing auth cookies and setting cooldown")
      
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
      
      supabaseResponse.cookies.set("rate_limit_cooldown", Date.now().toString(), {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
