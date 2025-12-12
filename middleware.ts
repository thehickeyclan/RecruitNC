import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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

    // If we get a rate limit error, clear auth cookies and skip session refresh
    if (userError && (
      userError.message?.includes("rate limit") || 
      userError.message?.includes("429") ||
      userError.message?.includes("Too many")
    )) {
      console.warn("[Middleware] Rate limit detected on getUser, clearing auth cookies and skipping session refresh")
      
      // Clear all Supabase auth cookies
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
      
      return supabaseResponse
    }

    // Only refresh session if we have a user or no error
    // Skip session refresh if we're rate limited to prevent further attempts
    if (user || !userError) {
      const { error: sessionError } = await supabase.auth.getSession()
      
      // If session refresh also hits rate limit, clear cookies
      if (sessionError && (
        sessionError.message?.includes("rate limit") || 
        sessionError.message?.includes("429") ||
        sessionError.message?.includes("Too many")
      )) {
        console.warn("[Middleware] Rate limit detected on getSession, clearing auth cookies")
        
        const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
        cookiesToClear.forEach(cookie => {
          supabaseResponse.cookies.delete(cookie.name)
        })
      }
    }
  } catch (error: any) {
    // If we catch a rate limit error, clear cookies and continue
    const errorMsg = error?.message || error?.toString() || ""
    if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("Too many")) {
      console.warn("[Middleware] Rate limit exception caught, clearing auth cookies")
      
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
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
