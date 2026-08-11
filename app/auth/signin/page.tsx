"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Trophy, Users, Edit, ArrowRight } from "lucide-react"

function isTocScopedAdminTarget(path: string | null): boolean {
  if (!path) return false
  return (
    path === "/admin/toc/invitations" ||
    path.startsWith("/admin/toc/invitations/") ||
    path === "/admin/toc/field" ||
    path.startsWith("/admin/toc/field/") ||
    path === "/admin/toc/plan" ||
    path.startsWith("/admin/toc/plan/")
  )
}

function getSafeReturnTo(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  if (value.startsWith("/auth/signin") || value.startsWith("/auth/signup")) return null
  return value
}

function authIntentForPath(path: string | null) {
  const target = path || ""

  if (target.startsWith("/public-rankings") || target.startsWith("/rankings") || target.startsWith("/admin/rankings")) {
    return {
      badge: "RANKINGS ACCESS",
      title: "Sign in for RecruitNC rankings",
      description:
        "Rankings are an account feature so we can protect the work, personalize your view, and keep future premium access tied to your profile.",
      bullets: ["View RecruitNC prospect rankings", "Track ranked athletes and updates", "Use ranking tools tied to your account"],
    }
  }

  if (target.includes("submit-profile") || target.includes("create-profile") || target.includes("/edit") || target.includes("claim") || target.startsWith("/athletes/")) {
    return {
      badge: "PROFILE ACCESS",
      title: "Sign in to manage athlete profiles",
      description:
        "Create, claim, or edit an athlete profile with protected recruiting details and profile activity tied to the right account.",
      bullets: ["Claim or create an athlete profile", "Update results, school, bio, and recruiting info", "See profile-view analytics when connected"],
    }
  }

  if (target.startsWith("/calendar")) {
    return {
      badge: "EVENT ACCESS",
      title: "Sign in for RecruitNC events",
      description:
        "Public schedules are easy to browse, but account access lets you manage registrations, reminders, and event-specific tools.",
      bullets: ["Access event registrations", "Manage reminders and account-specific actions", "Use NC United calendar tools"],
    }
  }

  if (target.startsWith("/tournament-of-champions")) {
    return {
      badge: "TOC ACCESS",
      title: "Sign in for Tournament of Champions actions",
      description:
        "The TOC page is public, but account access is needed for protected actions like confirmations, payments, nominations, and personalized tools.",
      bullets: ["Confirm or manage invite-related actions", "Access protected TOC forms and tools", "Keep Tournament of Champions updates tied to your account"],
    }
  }

  if (target.startsWith("/admin")) {
    return {
      badge: "ADMIN ACCESS",
      title: "Admin access required",
      description:
        "This area is limited to approved RecruitNC operators and event staff. Sign in with an account that has access to this page.",
      bullets: ["Manage protected RecruitNC workflows", "Use approved admin tools", "Keep changes tied to the signed-in user"],
    }
  }

  return {
    badge: "100% FREE",
    title: "Create a Free RecruitNC Account",
    description:
      "Browse North Carolina wrestling history publicly. Sign up when you want to claim a profile, use tools, or manage your account.",
    bullets: ["Claim or create athlete profiles", "View profile analytics and account activity", "Use Data Dawg, wallet, Blue, messaging, and alerts"],
  }
}

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [stuckInIframe, setStuckInIframe] = useState(false)
  const [clearingCooldown, setClearingCooldown] = useState(false)
  const [redirectingAfterSignIn, setRedirectingAfterSignIn] = useState(false)
  const mountedAt = useRef<number>(0)

  const clearRateLimitCooldown = async () => {
    setClearingCooldown(true)
    try {
      sessionStorage.removeItem("rate_limit_cooldown")
      document.cookie = "rate_limit_cooldown=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      await fetch("/api/auth/clear-cooldown", { method: "POST", credentials: "include" })
      setError("")
    } catch {}
    setClearingCooldown(false)
  }

  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = getSafeReturnTo(searchParams.get("returnTo") || searchParams.get("redirect"))
  const authIntent = authIntentForPath(returnTo)

  // Show friendly message when redirected here after a failed reset-link exchange
  useEffect(() => {
    const err = searchParams.get("error")
    if (err === "exchange_failed" || err === "no_session") {
      setError("That reset link didn’t work. It may have expired or already been used. Request a new one below.")
    }
  }, [searchParams])

  // Chrome desktop blocks cookies in iframes (e.g. app embedded in ncwrestlingunited.com).
  // Break out so sign-in loads first-party and login works.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.self === window.top) return
    try {
      window.top!.location.href = window.location.href
      // If we get here without navigating, we're stuck (e.g. sandbox/cross-origin)
      setTimeout(() => setStuckInIframe(true), 500)
    } catch {
      setStuckInIframe(true)
    }
  }, [])

  // If already logged in, redirect only after server confirms session (avoids Chrome blink:
  // stale client session → redirect → target page has no cookie → redirect back to signin).
  useEffect(() => {
    if (isLoading || !user) return
    let cancelled = false
    const target = returnTo || "/"
    fetch("/api/profile", { credentials: "include" })
      .then((r) => {
        if (cancelled) return
        if (r.ok) window.location.href = target
        // 401 = server doesn't see session (e.g. Chrome dropped cookie); don't redirect so user can sign in again
        // Silently ignore 401 - it's expected when not logged in
      })
      .catch(() => { if (!cancelled) { /* stay on page */ } })
    return () => { cancelled = true }
  }, [user, isLoading, returnTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    void fetch("/api/track-funnel-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event: "signin_started",
        path: "/auth/signin",
        target: returnTo || null,
        source: "signin_page",
      }),
    }).catch(() => {})

    const isAdminTarget = (returnTo?.startsWith("/admin") || returnTo?.startsWith("/users-dashboard")) && !isTocScopedAdminTarget(returnTo)

    // Always use server-side sign-in so we avoid Supabase anon-key rate limits in production.
    if (isAdminTarget) {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      let err: { error?: string } = {}
      try {
        err = await res.json()
      } catch {
        err = {}
      }
      if (res.ok) {
        void fetch("/api/track-funnel-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            event: "signin_completed",
            path: "/auth/signin",
            target: returnTo || null,
            source: "signin_page",
          }),
        }).catch(() => {})
        setRedirectingAfterSignIn(true)
        const next = returnTo ? encodeURIComponent(returnTo) : ""
        setTimeout(() => { window.location.replace(next ? `/auth/callback-admin?next=${next}` : "/auth/callback-admin") }, 1200)
        return
      }
      const errorMsg = typeof err === "object" && err !== null && "error" in err && typeof err.error === "string" ? err.error : null
      if (res.status === 401) setError(errorMsg || "Invalid email or password.")
      else if (res.status === 403) setError(errorMsg || "Admin access required.")
      else setError(errorMsg || "Login failed")
      setLoading(false)
      return
    }

    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    let data: { error?: string } = {}
    try {
      data = await res.json()
    } catch {
      data = {}
    }
    if (res.ok) {
      void fetch("/api/track-funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event: "signin_completed",
          path: "/auth/signin",
          target: returnTo || null,
          source: "signin_page",
        }),
      }).catch(() => {})
      setRedirectingAfterSignIn(true)
      const target = returnTo || "/"
      // Redirect immediately so login isn't blocked by a flaky profile check
      window.location.replace(target)
      return
    }
    const errorMsg = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : null
    setError(errorMsg || "Invalid email or password.")
    setLoading(false)
  }

  // When stuck in iframe, cookies are blocked — show only "open in new tab"
  if (stuckInIframe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle>Sign in requires full access</CardTitle>
            <CardDescription>
              You&apos;re viewing this inside another site. Chrome blocks sign-in in this view. Open the sign-in page in its own tab to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Open sign-in in new tab
            </Button>
            <p className="text-xs text-center text-gray-500">
              A new tab will open where you can sign in successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pt-4 sm:pt-8 pb-8 px-4">
      <div className="w-full max-w-6xl mt-4 sm:mt-8">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Prominent Registration Banner for New Users */}
          <Card className="w-full shadow-xl border-2 border-[#B31B1B] bg-gradient-to-br from-[#003366] to-[#1e3a8a] text-white overflow-hidden order-2 lg:order-1">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
            <CardContent className="relative p-4 sm:p-6 md:p-8">
              <div className="text-center mb-6">
                <Badge className="mb-4 bg-[#D3B574] text-[#003366] text-sm font-bold px-4 py-1">
                  {authIntent.badge}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  {authIntent.title}
                </h2>
                <p className="text-lg md:text-xl text-blue-100 mb-6">
                  {authIntent.description}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <Edit className="h-6 w-6 md:h-8 md:w-8 text-[#D3B574] mb-2 mx-auto" />
                  <h3 className="font-semibold mb-1 text-center text-xs md:text-sm">Claim Profiles</h3>
                  <p className="text-xs text-blue-100 text-center hidden md:block">{authIntent.bullets[0]}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-[#D3B574] mb-2 mx-auto" />
                  <h3 className="font-semibold mb-1 text-center text-xs md:text-sm">View Interest</h3>
                  <p className="text-xs text-blue-100 text-center hidden md:block">{authIntent.bullets[1]}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-[#D3B574] mb-2 mx-auto" />
                  <h3 className="font-semibold mb-1 text-center text-xs md:text-sm">Use Tools</h3>
                  <p className="text-xs text-blue-100 text-center hidden md:block">{authIntent.bullets[2]}</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/20 mb-6">
                <div className="flex items-start gap-2 md:gap-3">
                  <Edit className="h-4 w-4 md:h-5 md:w-5 text-[#D3B574] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">What stays account-only?</h3>
                    <p className="text-xs md:text-sm text-blue-100">
                      Editing, contact info, GPA/recruiting data, messaging, payments, wallet, profile analytics, and unlimited personalized tools.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#D3B574] hover:bg-[#c4a151] text-[#003366] font-bold text-base md:text-lg px-6 md:px-8 py-5 md:py-6 h-auto w-full"
                >
                  <Link href={`/auth/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} target="_top" rel="noopener">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Link>
                </Button>
                <p className="text-xs md:text-sm text-blue-200 mt-3">
                  No credit card required • Takes less than 2 minutes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sign In Card */}
          <Card className="w-full shadow-lg relative z-10 order-1 lg:order-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl sm:text-2xl font-bold">Sign In</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {returnTo ? `Sign in to continue to ${returnTo}.` : "Enter your credentials to access your account."}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <form method="post" onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                    autoComplete="email"
                    required
                    disabled={loading}
                    placeholder="your@email.com"
                    className="w-full text-base"
                    style={{ WebkitAppearance: "none" }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    placeholder="Enter your password"
                    className="w-full text-base"
                    style={{ WebkitAppearance: "none" }}
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                    {(error.includes("rate limit") || error.includes("429") || error.includes("Too many")) && (
                      <div className="mt-3 flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full border-blue-400 text-blue-700 hover:bg-blue-50"
                          disabled={clearingCooldown}
                          onClick={clearRateLimitCooldown}
                        >
                          {clearingCooldown ? "Clearing..." : "Clear cooldown & try again"}
                        </Button>
                        <a href="/auth/clear-cooldown" target="_top" rel="noopener" className="text-xs text-blue-600 hover:underline text-center">
                          Or open clear-cooldown page
                        </a>
                      </div>
                    )}
                    {error.includes("reset link") && (
                      <p className="mt-2 text-xs">
                        <Link href="/auth/forgot-password" className="text-blue-600 hover:underline font-medium">
                          Request a new reset link
                        </Link>
                      </p>
                    )}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 text-base sm:text-lg font-semibold" 
                  disabled={loading || redirectingAfterSignIn}
                >
                  {redirectingAfterSignIn ? "Sign-in successful, redirecting…" : loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-4 text-center space-y-2">
                <p className="text-xs sm:text-sm text-gray-600">
                  <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
                    Forgot your password?
                  </Link>
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {"Don't have an account? "}
                  <Link
                    href={`/auth/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                    target="_top"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
