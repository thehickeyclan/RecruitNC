import { NextResponse, type NextRequest } from "next/server"
import { FUNDRAISING_AUTH_RETURN_COOKIE } from "@/lib/fundraising/fundraising-auth-return-cookie"

function isFundraisingHubPublicPath(p: string): boolean {
  if (p === "/fundraising" || p === "/fundraising/") return true
  if (p.startsWith("/fundraising/scholarships")) return true
  if (p.startsWith("/fundraising/") && p.includes("/thanks")) return true
  return false
}

/**
 * ⚠️ LOCKED MIDDLEWARE CONFIGURATION - DO NOT MODIFY ⚠️
 *
 * This middleware MUST NOT call getUser() or getSession().
 * Making auth calls here causes rate limits on every request.
 *
 * See AUTH_CONFIG_LOCKED.md for full documentation.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // The printed QR code. Redirecting here rather than in the page gives an iPhone a real 307
  // before anything renders — the page-level redirect streamed the fallback first, so a scan
  // flashed "the app is on iPhone first" on its way to the App Store.
  if (pathname === "/download" || pathname === "/download/") {
    const ua = request.headers.get("user-agent") ?? ""
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return NextResponse.redirect("https://apps.apple.com/app/id6803202791", 307)
    }
  }

  // The Spartan race campaign is archived, not deleted: its code, Stripe records and
  // admin exports stay intact, but the public pages now land on the one giving form.
  // `/spartan/thanks` stays reachable — Stripe sessions created before the archive
  // still return there.
  if (pathname === "/spartan" || (pathname.startsWith("/spartan/") && !pathname.startsWith("/spartan/thanks"))) {
    return NextResponse.redirect(new URL("/fundraising", request.url), 308)
  }

  // Individual-athlete giving is retired. Keep all public giving organizational
  // or within a separately governed scholarship fund.
  if (
    pathname === "/fundraising/athletes" ||
    pathname.startsWith("/fundraising/athletes/") ||
    pathname === "/fundraising/leaderboard" ||
    pathname.startsWith("/fundraising/leaderboard/") ||
    pathname === "/fundraising/activity" ||
    pathname.startsWith("/fundraising/activity/") ||
    pathname === "/fundraising/playbook" ||
    pathname.startsWith("/fundraising/playbook/")
  ) {
    return NextResponse.redirect(new URL("/fundraising", request.url), 308)
  }

  // Retire legacy campaign and miscellaneous giving URLs. The only public
  // giving destinations are the general NC United Fund and named scholarships.
  if (pathname.startsWith("/fundraising/")) {
    const firstSegment = pathname.split("/")[2] ?? ""
    const allowedGivingSections = new Set(["training-fund", "scholarships"])
    if (firstSegment && !allowedGivingSections.has(firstSegment)) {
      return NextResponse.redirect(new URL("/fundraising", request.url), 308)
    }
  }

  // Never run middleware on static/public assets (avoids any chance of 401 on manifest, icons, etc.)
  const staticPaths = ["/manifest.json", "/favicon.ico", "/icon-192", "/icon-512", "/icon.svg"]
  if (staticPaths.some((p) => pathname === p || pathname.startsWith(p + "."))) {
    return NextResponse.next({ request })
  }
  if (/\.(json|ico|png|jpg|jpeg|gif|webp|svg)$/i.test(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  if (pathname.startsWith("/fundraising")) {
    if (isFundraisingHubPublicPath(pathname)) {
      return supabaseResponse
    }
    const returnTarget = pathname + request.nextUrl.search
    const res = NextResponse.next({ request })
    res.cookies.set(FUNDRAISING_AUTH_RETURN_COOKIE, encodeURIComponent(returnTarget), {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    })
    return res
  }

  // Skip middleware entirely for public routes that don't need auth (no Supabase calls — see header comment above).
  const publicRoutes = [
    '/view-profile',
    '/athletes',
    '/athletes-public',
    '/prospects',
    '/schools',
    '/colleges',
    // Public club directory. /clubs/submit still requires an account — it checks
    // auth itself on the page and the submissions API returns 401.
    '/clubs',
    '/api/clubs',
    '/news',
    '/blue',
    '/go',
    '/store',
    '/store-app',
    '/cart',
    '/tournament-of-champions',
    '/nchsaa',
    '/nhsca',
    '/fargo',
    '/national-team',
    '/stats',
    '/stats-simple',
    '/about',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verification',
    '/auth/clear-session',
    '/auth/clear-cooldown',
    '/auth/callback',
    '/api/auth/signin',
    '/api/auth/update-password',
    '/api/auth/signup',
    '/api/auth/reset-password',
    '/api/auth/clear-cooldown',
    '/api/debug',
    '/api/nchsaa-lookup',
    '/api/manifest',
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
    // Cooldown 30 seconds so deploy/re-login isn't stuck long
    if (now < cooldownTime + 30000) {
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
     * Match all request paths except: static assets, and /store (store runs with zero middleware).
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon-|store(?:/|$)|store-app(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
}
