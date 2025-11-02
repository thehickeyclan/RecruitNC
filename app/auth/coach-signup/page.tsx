"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function CoachSignupPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    institution: "",
    coachingPosition: "",
    yearsExperience: "",
    coachingCredentials: "",
    referencesContact: "",
    additionalInfo: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      // Sign up with coach metadata
      const { error: signUpError } = await signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`,
        role: "coach",
        profile_type: "coach",
        institution: formData.institution,
        coaching_position: formData.coachingPosition,
      })

      if (signUpError) {
        throw signUpError
      }

      setSuccess(true)

      // Redirect to success page after a delay
      setTimeout(() => {
        router.push("/auth/coach-verification-pending")
      }, 2000)
    } catch (error: any) {
      console.error("Coach signup error:", error)
      setError(error.message || "Failed to create coach account")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-800">Welcome to NC Wrestling!</CardTitle>
            <CardDescription>Please check your email to verify your account and get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                After verifying your email, you&apos;ll have full access to browse athletes, view rankings, and explore
                the platform. Admin approval for athlete contact information will be processed in the background.
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={() => router.push("/auth/signin")}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Coach Registration</CardTitle>
          <CardDescription>Create your coach account and request verification</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Account Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Account Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Coaching Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Coaching Information</h3>

              <div className="space-y-2">
                <Label htmlFor="institution">Institution/School</Label>
                <Input
                  id="institution"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  placeholder="e.g., University of North Carolina"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coachingPosition">Coaching Position</Label>
                  <Select
                    value={formData.coachingPosition}
                    onValueChange={(value) => handleSelectChange("coachingPosition", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head-coach">Head Coach</SelectItem>
                      <SelectItem value="assistant-coach">Assistant Coach</SelectItem>
                      <SelectItem value="volunteer-coach">Volunteer Coach</SelectItem>
                      <SelectItem value="recruiting-coordinator">Recruiting Coordinator</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    name="yearsExperience"
                    type="number"
                    min="0"
                    value={formData.yearsExperience}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coachingCredentials">Coaching Credentials</Label>
                <Textarea
                  id="coachingCredentials"
                  name="coachingCredentials"
                  value={formData.coachingCredentials}
                  onChange={handleChange}
                  placeholder="List your coaching certifications, achievements, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencesContact">Professional References</Label>
                <Textarea
                  id="referencesContact"
                  name="referencesContact"
                  value={formData.referencesContact}
                  onChange={handleChange}
                  placeholder="Provide contact information for professional references"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  placeholder="Any additional information to support your verification request"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Creating Account..." : "Create Coach Account"}
              </Button>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth/signin" className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
