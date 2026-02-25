"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Trophy, Users, GraduationCap, Edit, CheckCircle, ArrowRight } from "lucide-react"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [stuckInIframe, setStuckInIframe] = useState(false)
  const [clearingCooldown, setClearingCooldown] = useState(false)

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

  const { signIn, user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || searchParams.get("redirect")

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

  // If already logged in, redirect to returnTo or home to break redirect loops
  useEffect(() => {
    if (isLoading) return
    if (user) {
      const target = returnTo && returnTo !== "/auth/signin" ? returnTo : "/"
      window.location.href = target
    }
  }, [user, isLoading, returnTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log("[v0] Sign in attempt for:", email)

    const isAdminTarget = returnTo?.startsWith("/admin") || returnTo?.startsWith("/users-dashboard")

    // For admin: use server-side login so cookies are set reliably (client-side session often doesn't survive nav)
    if (isAdminTarget) {
      try {
        const res = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        })
        if (res.ok) {
          setTimeout(() => { window.location.href = "/auth/callback-admin" }, 600)
          return
        }
        const err = await res.json().catch(() => ({}))
        if (res.status === 401) setError(err.error || "Invalid email or password.")
        else if (res.status === 403) setError(err.error || "Admin access required.")
        else setError(err.error || "Login failed")
        setLoading(false)
        return
      } catch {
        // Fallback to regular sign-in
        const result = await signIn(email, password)
        if (result.error) setError(result.error.message || "Login failed")
        else setTimeout(() => { window.location.href = "/auth/callback-admin" }, 2500)
        setLoading(false)
        return
      }
    }

    // Non-admin: regular sign in
    const result = await signIn(email, password)
    if (result.error && (result.error.message?.includes("rate limit") || result.error.message?.includes("429"))) {
      try {
        const res = await fetch("/api/auth/admin-login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({ email, password }),
        })
        if (res.ok) {
          setTimeout(() => { window.location.href = returnTo || "/" }, 1000)
          return
        }
      } catch {}
      // Set cooldown so we stop hitting Supabase from this browser (helps Chrome desktop)
      const cooldownUntil = Date.now()
      if (typeof document !== "undefined") {
        document.cookie = `rate_limit_cooldown=${cooldownUntil}; path=/; max-age=120; SameSite=Lax`
        try { sessionStorage.setItem("rate_limit_cooldown", String(cooldownUntil)) } catch {}
      }
      setError("Rate limited. Please wait a few minutes.")
      setLoading(false)
      return
    }
    if (result.error) {
      setError(result.error.message || "Invalid email or password.")
      setLoading(false)
    } else {
      setTimeout(() => { window.location.href = returnTo || "/" }, 2500)
    }
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
                  100% FREE
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Register for Free Access
                </h2>
                <p className="text-lg md:text-xl text-blue-100 mb-6">
                  Get instant access to all of North Carolina's College Prospect Rankings, College Commitments, and Athlete Profiles
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-[#D3B574] mb-2 mx-auto" />
                  <h3 className="font-semibold mb-1 text-center text-xs md:text-sm">Prospect Rankings</h3>
                  <p className="text-xs text-blue-100 text-center hidden md:block">Access all NC rankings</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-[#D3B574] mb-2 mx-auto" />
                  <h3 className="font-semibold mb-1 text-center text-xs md:text-sm">College Commitments</h3>
                  <p className="text-xs text-blue-100 text-center hidden md:block">Track commitments</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-[#D3B574] mb-2 mx-auto" />
                  <h3 className="font-semibold mb-1 text-center text-xs md:text-sm">Athlete Profiles</h3>
                  <p className="text-xs text-blue-100 text-center hidden md:block">Browse profiles</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/20 mb-6">
                <div className="flex items-start gap-2 md:gap-3">
                  <Edit className="h-4 w-4 md:h-5 md:w-5 text-[#D3B574] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Real-Time Profile Updates</h3>
                    <p className="text-xs md:text-sm text-blue-100">
                      Athletes can update and edit their profiles in real time.
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
              <CardDescription className="text-sm sm:text-base">Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
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
