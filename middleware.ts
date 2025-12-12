import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // CRITICAL: Check for rate limit cooldown BEFORE attempting any auth
  // This prevents repeated auth attempts that trigger rate limits
  const rateLimitCooldown = request.cookies.get("rate_limit_cooldown")?.value
  if (rateLimitCooldown) {
    const cooldownTime = parseInt(rateLimitCooldown, 10)
    const now = Date.now()
    // Cooldown is 5 minutes (300000ms) - longer than Supabase's 60 second limit
    if (now < cooldownTime + 300000) {
      // Still in cooldown - skip ALL auth attempts
      console.warn("[Middleware] Rate limit cooldown active, skipping auth checks")
      
      // Clear any stale Supabase cookies to prevent refresh attempts
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
      
      return supabaseResponse
    } else {
      // Cooldown expired, clear the flag
      supabaseResponse.cookies.delete("rate_limit_cooldown")
    }
  }

  // Check if we have any Supabase cookies - if not, skip auth entirely
  const hasSupabaseCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (!hasSupabaseCookies) {
    // No auth cookies, skip auth checks entirely
    return supabaseResponse
  }

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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

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
      
      // Set cooldown cookie (5 minutes) to prevent further attempts
      supabaseResponse.cookies.set("rate_limit_cooldown", Date.now().toString(), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 300, // 5 minutes
        path: "/",
      })
      
      return supabaseResponse
    }

    // Only refresh session if we have a user or no error
    // Skip session refresh if we're rate limited to prevent further attempts
    if (user || !userError) {
      const { error: sessionError } = await supabase.auth.getSession()
      
      // If session refresh also hits rate limit, clear cookies and set cooldown
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
        
        // Set cooldown cookie (5 minutes) to prevent further attempts
        supabaseResponse.cookies.set("rate_limit_cooldown", Date.now().toString(), {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 300, // 5 minutes
          path: "/",
        })
      }
    }
  } catch (error: any) {
    // If we catch a rate limit error, clear cookies, set cooldown, and continue
    const errorMsg = error?.message || error?.toString() || ""
    if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("Too many")) {
      console.warn("[Middleware] Rate limit exception caught, clearing auth cookies and setting cooldown")
      
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
      
      // Set cooldown cookie (5 minutes) to prevent further attempts
      supabaseResponse.cookies.set("rate_limit_cooldown", Date.now().toString(), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 300, // 5 minutes
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
