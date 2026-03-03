"use client"

import type React from "react"

import { useState } from "react"
import { Mail, Phone } from "lucide-react"
import { PhoneSignIn } from "@/components/phone-sign-in"
import { SocialLoginButtons } from "@/components/social-login-buttons"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AuthMethod = "email" | "phone"

export function UnifiedSignUpForm() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email")

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Choose how you'd like to sign up</p>
          </div>

          {/* Authentication method selector */}
          <div className="flex space-x-2">
            <Button
              variant={authMethod === "email" ? "default" : "outline"}
              onClick={() => setAuthMethod("email")}
              className="w-1/2 flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </Button>
            <Button
              variant={authMethod === "phone" ? "default" : "outline"}
              onClick={() => setAuthMethod("phone")}
              className="w-1/2 flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span>Phone</span>
            </Button>
          </div>

          {/* Social login options */}
          <SocialLoginButtons />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with {authMethod === "email" ? "email" : "phone"}
              </span>
            </div>
          </div>

          {/* Conditional form based on selected method */}
          {authMethod === "email" ? <EmailSignUpSection /> : <PhoneSignIn />}
        </div>
      </CardContent>
    </Card>
  )
}

function EmailSignUpSection() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [cellPhone, setCellPhone] = useState("")
  const [profileType, setProfileType] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Post to the server so we atomically create the auth user and user_profiles row.
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          // Optional fields below are additive and safe
          cellPhone: cellPhone.trim() || undefined,
          profileType: profileType || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Failed to create account")
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground">We&apos;ve sent you a confirmation link to {email}</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Click the link in your email to verify your account.</strong> You&apos;ll be automatically signed in
            after confirmation - no need to log in manually!
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Check your inbox and spam folder. The link expires in 24 hours.
          </p>
          <Button className="w-full bg-transparent" variant="outline" onClick={() => window.location.href = "/"}>
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

      {/* Full name (recommended) */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      {/* Cell phone (now required) */}
      <div className="space-y-2">
        <Label htmlFor="cellPhone">Cell phone</Label>
        <Input
          id="cellPhone"
          placeholder="+1 555 555 5555"
          value={cellPhone}
          onChange={(e) => setCellPhone(e.target.value)}
          inputMode="tel"
          required
        />
      </div>

      {/* Profile type (now required) */}
      <div className="space-y-2">
        <Label>Profile type</Label>
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

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  )
}
