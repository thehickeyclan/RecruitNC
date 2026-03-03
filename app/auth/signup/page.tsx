"use client"

import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trophy, Users, GraduationCap, Edit, CheckCircle } from "lucide-react"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")

  // Required fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Optional fields (additive, non-breaking)
  const [cellPhone, setCellPhone] = useState("")
  const [profileType, setProfileType] = useState<string>("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          password,
          // Optional extras; safe even if the API ignores them
          cellPhone: cellPhone.trim() || undefined,
          profileType: profileType || undefined,
          returnTo: returnTo || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errorMessage = (data as any)?.error || data?.message || `An error occurred during sign up (${res.status})`
        console.error("[Signup] API error:", res.status, errorMessage, data)
        setError(errorMessage)
        setLoading(false)
        return
      }

      console.log("[Signup] Success:", data)
      setSuccess(true)
    } catch (err: any) {
      console.error("[Signup] Exception:", err)
      setError(err?.message || "An unexpected error occurred during sign up. Please try again.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-start pt-20 md:items-center md:pt-0 justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>We&apos;ve sent you a confirmation link to complete your registration.</CardDescription>
          </CardHeader>
          <CardContent>
            {profileType === "college-coach" && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Welcome, Coach!</strong> After verifying your email, you&apos;ll have immediate access to browse 
                  prospect rankings and profiles. Within 1 hour of admin approval, you&apos;ll gain access to:
                  <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
                    <li>Athlete GPA, SAT, ACT scores</li>
                    <li>Phone numbers and email addresses</li>
                    <li>Watch list and recruiting tools</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> Click the confirmation link in your email to verify your account.
                You&apos;ll be automatically signed in - no need to log in manually!
              </p>
              <p className="text-sm text-muted-foreground">
                Check your inbox (and spam folder) for an email from RecruitNC. The link expires in 24 hours.
              </p>
              <Button className="w-full bg-transparent" variant="outline" onClick={() => window.location.href = "/"}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start pt-8 md:items-center md:pt-0 justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 px-4 pb-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Prominent Benefits Banner */}
        <Card className="w-full shadow-xl border-2 border-[#B31B1B] bg-gradient-to-br from-[#03154C] to-[#1e3a8a] text-white overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <CardContent className="relative p-6 md:p-8">
            <div className="text-center mb-6">
              <Badge className="mb-4 bg-[#D3B574] text-[#03154C] text-sm font-bold px-4 py-1">
                100% FREE • NO CREDIT CARD REQUIRED
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Get Free Access to All North Carolina Wrestling Data
              </h2>
              <p className="text-lg md:text-xl text-blue-100 mb-6">
                Register now and instantly access rankings, commitments, and athlete profiles
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <Trophy className="h-8 w-8 text-[#D3B574] mb-2 mx-auto" />
                <h3 className="font-semibold mb-1 text-center text-sm md:text-base">Prospect Rankings</h3>
                <p className="text-xs md:text-sm text-blue-100 text-center">All NC college prospect rankings</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <GraduationCap className="h-8 w-8 text-[#D3B574] mb-2 mx-auto" />
                <h3 className="font-semibold mb-1 text-center text-sm md:text-base">College Commitments</h3>
                <p className="text-xs md:text-sm text-blue-100 text-center">Track all commitments</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <Users className="h-8 w-8 text-[#D3B574] mb-2 mx-auto" />
                <h3 className="font-semibold mb-1 text-center text-sm md:text-base">Athlete Profiles</h3>
                <p className="text-xs md:text-sm text-blue-100 text-center">Complete athlete profiles</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-start gap-3">
                <Edit className="h-5 w-5 text-[#D3B574] mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1 text-sm md:text-base">Real-Time Profile Updates</h3>
                  <p className="text-xs md:text-sm text-blue-100">
                    Athletes can update and edit their profiles in real time. Keep your information current and showcase your latest achievements.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign Up Form */}
        <Card className="w-full shadow-lg relative z-10">
          <CardHeader>
            <CardTitle>Create Your Free Account</CardTitle>
            <CardDescription>Sign up takes less than 2 minutes</CardDescription>
          </CardHeader>
        <CardContent className="relative z-10">
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

          <form method="post" onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onInput={(e) => setFirstName((e.target as HTMLInputElement).value)}
                  autoComplete="given-name"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onInput={(e) => setLastName((e.target as HTMLInputElement).value)}
                  autoComplete="family-name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                autoComplete="new-password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {/* Optional, additive fields */}
            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell Phone <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input
                id="cellPhone"
                name="cellPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 555 555 5555"
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                onInput={(e) => setCellPhone((e.target as HTMLInputElement).value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Type <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Select value={profileType} onValueChange={setProfileType} disabled={loading}>
                <SelectTrigger aria-label="Profile type">
                  <SelectValue placeholder="Select a profile type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="college-coach">College Coach</SelectItem>
                  <SelectItem value="hs-club-coach">High School/Club Coach</SelectItem>
                  <SelectItem value="referee">Referee</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href={`/auth/signin${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
