"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SignUpForm() {
  const router = useRouter()

  // Required
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Optional (additive, low-friction)
  const [cellPhone, setCellPhone] = useState("")
  const [profileType, setProfileType] = useState<string>("")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void fetch("/api/track-funnel-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event: "signup_started",
        path: "/auth/signup",
        source: "legacy_signup_form",
      }),
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      void fetch("/api/track-funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event: "signup_submitted",
          path: "/auth/signup",
          source: "legacy_signup_form",
        }),
      }).catch(() => {})

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          password,
          // Optional fields: only sent if provided
          cellPhone: cellPhone.trim() || undefined,
          profileType: profileType || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const message = data?.error || "Failed to create account"
        void fetch("/api/track-funnel-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            event: "signup_error",
            path: "/auth/signup",
            source: "legacy_signup_form",
            message,
          }),
        }).catch(() => {})
        setError(message)
        return
      }

      void fetch("/api/track-funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event: "signup_completed",
          path: "/auth/signup",
          source: "legacy_signup_form",
        }),
      }).catch(() => {})
      void fetch("/api/track-funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event: "verification_email_sent",
          path: "/auth/signup",
          source: "legacy_signup_form",
        }),
      }).catch(() => {})
      setSuccess(true)
    } catch (err) {
      console.error(err)
      void fetch("/api/track-funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event: "signup_error",
          path: "/auth/signup",
          source: "legacy_signup_form_exception",
          message: err instanceof Error ? err.message : "Unexpected signup exception",
        }),
      }).catch(() => {})
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a verification link to {email}. Please verify to finish setting up your account.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/signin" target="_top" rel="noopener">Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Sign Up</h1>
            <p className="text-sm text-muted-foreground">Create an account to get started</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {/* Optional fields to capture valuable context without blocking sign-up */}
            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell Phone</Label>
              <Input
                id="cellPhone"
                placeholder="+1 555 555 5555"
                inputMode="tel"
                autoComplete="tel"
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Type</Label>
              <Select value={profileType} onValueChange={setProfileType} required>
                <SelectTrigger aria-label="Profile type">
                  <SelectValue placeholder="Select a profile type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="college">College staff</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/signin" target="_top" rel="noopener" className="text-primary underline underline-offset-4 hover:no-underline font-normal">
              Sign in
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SignUpForm
