"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [recovering, setRecovering] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function recoverSessionFromUrl() {
      if (typeof window === "undefined") return

      const url = new URL(window.location.href)
      const hash = window.location.hash?.slice(1)
      const code = url.searchParams.get("code")
      const tokenHash = url.searchParams.get("token_hash")
      const type = url.searchParams.get("type")

      // Implicit flow: tokens in fragment (#access_token=...&refresh_token=...)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!setErr) {
            window.history.replaceState(null, "", "/auth/reset-password")
            setHasSession(true)
            setRecovering(false)
            return
          }
        }
      }

      // PKCE: code in query
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeErr) {
          window.history.replaceState(null, "", "/auth/reset-password")
          setHasSession(true)
          setRecovering(false)
          return
        }
      }

      // Token hash flow: token_hash + type in query
      if (tokenHash && type) {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery" | "signup" | "invite" | "magiclink" | "email_change",
        })
        if (!verifyErr) {
          window.history.replaceState(null, "", "/auth/reset-password")
          setHasSession(true)
          setRecovering(false)
          return
        }
      }

      // No URL params to recover from – check existing session
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
      if (!session) setError("Invalid or expired reset link. Please request a new one from the sign-in page.")
      setRecovering(false)
    }

    recoverSessionFromUrl()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setError(error.message || "Failed to reset password")
      } else {
        setSuccess(true)
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.push("/auth/signin")
        }, 3000)
      }
    } catch (err) {
      console.error("Reset password error:", err)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (recovering) {
    return (
      <div className="container mx-auto flex h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset Your Password</h1>
          <p className="mt-2 text-gray-600">Enter your new password below.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              <Link href="/auth/forgot-password" className="mt-2 block font-medium underline">
                Request a new link
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Password reset successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your password has been reset successfully. You will be redirected to the sign in page shortly.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={isLoading || hasSession === false}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
