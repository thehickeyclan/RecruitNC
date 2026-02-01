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

  const { signIn, user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || searchParams.get("redirect")

  // Chrome desktop blocks cookies in iframes. If we're in an iframe, break out
  // so the sign-in page loads first-party and login works.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.self === window.top) return
    try {
      window.top!.location.href = window.location.href
    } catch {
      // Cross-origin or sandbox: can't set top.location; banner will show
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

    // Try regular sign in first
    const result = await signIn(email, password)

    // If rate limited, try admin login API (bypasses rate limits)
    if (result.error && (result.error.message?.includes("rate limit") || result.error.message?.includes("429") || result.error.message?.includes("Too many"))) {
      console.log("[v0] Rate limited, trying admin login API...")
      try {
        const adminLoginRes = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        })

        if (adminLoginRes.ok) {
          const adminData = await adminLoginRes.json()
          console.log("[v0] Admin login successful via API, waiting for cookies...")
          // Wait for cookies to be set, then reload
          setTimeout(() => {
            const redirectUrl = returnTo?.startsWith("/admin") || returnTo?.startsWith("/users-dashboard") 
              ? "/auth/callback-admin" 
              : (returnTo || "/")
            console.log("[v0] Admin login redirecting to:", redirectUrl)
            window.location.href = redirectUrl
          }, 1000)
          return
        } else {
          const adminError = await adminLoginRes.json()
          setError(adminError.error || "Login failed. Please try again later.")
        }
      } catch (adminError: any) {
        console.error("[v0] Admin login API error:", adminError)
        setError("Rate limited. Please wait a few minutes and try again.")
      }
      setLoading(false)
      return
    }

    if (result.error) {
      console.error("[v0] Sign in error:", result.error)
      setError(result.error.message || "Invalid email or password. Please try again.")
      setLoading(false)
    } else {
      console.log("[v0] Sign in successful, waiting for session to be fully set...")
      // Wait 2.5s so session is in storage and AuthGuard won't redirect back to signin
      const redirectUrl = returnTo?.startsWith("/admin") || returnTo?.startsWith("/users-dashboard")
        ? "/auth/callback-admin"
        : (returnTo || "/")
      setTimeout(() => {
        console.log("[v0] Redirecting to:", redirectUrl)
        window.location.href = redirectUrl
      }, 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pt-4 sm:pt-8 pb-8 px-4">
      <div className="w-full max-w-6xl mt-4 sm:mt-8">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Prominent Registration Banner for New Users */}
          <Card className="w-full shadow-xl border-2 border-[#B31B1B] bg-gradient-to-br from-[#03154C] to-[#1e3a8a] text-white overflow-hidden order-2 lg:order-1">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>
            <CardContent className="relative p-4 sm:p-6 md:p-8">
              <div className="text-center mb-6">
                <Badge className="mb-4 bg-[#D3B574] text-[#03154C] text-sm font-bold px-4 py-1">
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
                  className="bg-[#D3B574] hover:bg-[#c4a151] text-[#03154C] font-bold text-base md:text-lg px-6 md:px-8 py-5 md:py-6 h-auto w-full"
                >
                  <Link href={`/auth/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>
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
                      <p className="mt-2 text-xs">
                        <Link href="/auth/clear-cooldown" className="text-blue-600 hover:underline">
                          Clear rate limit cooldown and try again
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
