"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Props = {
  /** True when session exists in HttpOnly cookies (e.g. after /auth/callback) — browser client may not see it. */
  serverHasSession: boolean
}

export function ResetPasswordClient({ serverHasSession }: Props) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSession, setHasSession] = useState(serverHasSession)
  const [recovering, setRecovering] = useState(!serverHasSession)

  useEffect(() => {
    if (serverHasSession) return

    const supabase = createClient()

    async function recoverSessionFromUrl() {
      if (typeof window === "undefined") return

      const url = new URL(window.location.href)
      const hash = window.location.hash?.slice(1)
      const code = url.searchParams.get("code")
      const tokenHash = url.searchParams.get("token_hash")
      const type = url.searchParams.get("type")

      const fail = (msg: string) => {
        setError(msg)
        setHasSession(false)
        setRecovering(false)
      }

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
          if (setErr) {
            fail(setErr.message || "Could not use reset link (session). Request a new one.")
            return
          }
          window.history.replaceState(null, "", "/auth/reset-password")
          setHasSession(true)
          setRecovering(false)
          return
        }
      }

      // PKCE: code in query
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeErr) {
          fail(
            exchangeErr.message ||
              "This reset link could not be verified. It may have expired — request a new reset email.",
          )
          return
        }
        window.history.replaceState(null, "", "/auth/reset-password")
        setHasSession(true)
        setRecovering(false)
        return
      }

      // Token hash flow: token_hash + type in query
      if (tokenHash && type) {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery" | "signup" | "invite" | "magiclink" | "email_change",
        })
        if (verifyErr) {
          fail(verifyErr.message || "Invalid or expired verification link.")
          return
        }
        window.history.replaceState(null, "", "/auth/reset-password")
        setHasSession(true)
        setRecovering(false)
        return
      }

      // No URL params — check existing session (client-visible only)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
        setRecovering(false)
        return
      }

      setHasSession(false)
      setError(
        "We could not verify your reset link, or your session expired. Please use “Forgot password” on the sign-in page to send a new link.",
      )
      setRecovering(false)
    }

    void recoverSessionFromUrl()
  }, [serverHasSession])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, confirmPassword }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        setError(data.error || "Failed to reset password")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = "/auth/signin"
      }, 3000)
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
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verifying reset link…</p>
        </div>
      </div>
    )
  }

  const showForm = hasSession && !success

  return (
    <div className="container mx-auto flex h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset your password</h1>
          <p className="mt-2 text-gray-600">
            {showForm ? "Enter and confirm your new password below." : "Set a new password for your RecruitNC account."}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              <Link href="/auth/forgot-password" className="mt-2 block font-medium underline">
                Request a new reset link
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
                  <p>Your password has been updated. You will be redirected to sign in shortly.</p>
                </div>
              </div>
            </div>
          </div>
        ) : showForm ? (
          <form method="post" onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New password
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
                Confirm new password
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving…" : "Save new password"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
