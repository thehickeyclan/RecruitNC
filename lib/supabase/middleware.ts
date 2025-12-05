import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

    // If we get a rate limit error, clear auth cookies and continue
    if (userError && (
      userError.message?.includes("rate limit") || 
      userError.message?.includes("429") ||
      userError.message?.includes("Too many")
    )) {
      console.warn("[Middleware] Rate limit detected, clearing auth cookies")
      
      // Clear all Supabase auth cookies
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
      
      return supabaseResponse
    }

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    await supabase.auth.getSession()

    return supabaseResponse
  } catch (error: any) {
    // If we catch a rate limit error, clear cookies and continue
    const errorMsg = error?.message || error?.toString() || ""
    if (errorMsg.includes("rate limit") || errorMsg.includes("429") || errorMsg.includes("Too many")) {
      console.warn("[Middleware] Rate limit exception caught, clearing auth cookies")
      
      // Clear all Supabase auth cookies
      const cookiesToClear = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
      cookiesToClear.forEach(cookie => {
        supabaseResponse.cookies.delete(cookie.name)
      })
    }
    
    return supabaseResponse
  }
}
