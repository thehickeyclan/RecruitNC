"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * College coach access: six fields, no email verification.
 *
 * Submitting creates the account with the password they chose, signs them in and opens the
 * rankings. Staff review every coach afterwards - see /api/auth/coach-signup.
 */
export default function CoachSignupPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", cellPhone: "", college: "", password: "", website: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/coach-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.")
        return
      }
      // Account made; sign in with the password they just chose and go to the rankings.
      const signIn = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      if (signIn.ok) {
        window.location.replace("/public-rankings")
        return
      }
      setDone(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <CardTitle className="text-2xl">You&apos;re in, Coach</CardTitle>
            <CardDescription>
              Your account is ready. Sign in with {form.email} and the password you just chose.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/signin?returnTo=%2Fpublic-rankings">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">College coach access</CardTitle>
          <CardDescription>
            Free for college coaches. Fill this in and you&apos;re straight into the rankings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" autoComplete="given-name" value={form.firstName} onChange={onChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" autoComplete="family-name" value={form.lastName} onChange={onChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell</Label>
              <Input id="cellPhone" name="cellPhone" type="tel" inputMode="tel" autoComplete="tel" value={form.cellPhone} onChange={onChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Input id="college" name="college" autoComplete="organization" placeholder="e.g. NC State" value={form.college} onChange={onChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create a password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={onChange} required />
            </div>

            {/* Honeypot: hidden from people, filled in by bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={onChange} />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Setting you up..." : "Get access"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
