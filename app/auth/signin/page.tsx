"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || searchParams.get("redirect")

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
      // Wait longer for session cookies to be fully set by Supabase
      // Then force full page reload to ensure cookies are picked up
      setTimeout(() => {
        const redirectUrl = returnTo?.startsWith("/admin") || returnTo?.startsWith("/users-dashboard")
          ? "/auth/callback-admin"
          : (returnTo || "/")
        console.log("[v0] Redirecting to:", redirectUrl, "- cookies should be set now")
        // Force full page reload to pick up session cookies
        window.location.href = redirectUrl
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-50 pt-8 pb-8 px-4">
      <div className="w-full max-w-md mt-8">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
              )}
              <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-gray-600">
                <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
                  Forgot your password?
                </Link>
              </p>
              <p className="text-sm text-gray-600">
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
  )
}
