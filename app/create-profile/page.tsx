"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PublicImageUpload } from "@/components/public-image-upload"
import { CheckCircle, Clock, User, Mail, Phone, Trophy, Camera, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"

const HS_WEIGHT_CLASSES = {
  Male: [
    { value: "106", label: "106 lbs" },
    { value: "113", label: "113 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "144", label: "144 lbs" },
    { value: "150", label: "150 lbs" },
    { value: "157", label: "157 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "175", label: "175 lbs" },
    { value: "190", label: "190 lbs" },
    { value: "215", label: "215 lbs" },
    { value: "285", label: "285 lbs" },
  ],
  Female: [
    { value: "100", label: "100 lbs" },
    { value: "107", label: "107 lbs" },
    { value: "114", label: "114 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "145", label: "145 lbs" },
    { value: "152", label: "152 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "185", label: "185 lbs" },
    { value: "235", label: "235 lbs" },
  ],
}

interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
  graduationYear: string
  weightClass: string
  highSchool: string
  location: string
  bio: string
  achievements: string
  photoUrl: string
}

export default function CreateProfilePage() {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    gender: "",
    graduationYear: "",
    weightClass: "",
    highSchool: "",
    location: "",
    bio: "",
    achievements: "",
    photoUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/profile/create-athlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to submit profile")
      }
    } catch (err) {
      setError("An error occurred while submitting your profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to create your athlete profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/auth/signin">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-primary">Profile Submitted Successfully!</CardTitle>
            <CardDescription className="text-lg">
              Your athlete profile has been submitted for admin review
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-medium">Under Review</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Our admin team will review your profile within 24-48 hours. You'll receive an email notification once
                approved.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/athletes")} variant="outline">
                Browse Athletes
              </Button>
              <Button onClick={() => router.push("/profile")}>View My Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const weightClassOptions = formData.gender
    ? HS_WEIGHT_CLASSES[formData.gender as keyof typeof HS_WEIGHT_CLASSES] || []
    : []

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Create Your Athlete Profile</h1>
          <p className="text-xl opacity-90">
            Join the North Carolina wrestling community and showcase your achievements
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Athlete Information
            </CardTitle>
            <CardDescription>
              Please fill out all required information. Your profile will be reviewed by our admin team before going
              live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Using your account email</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Athletic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Athletic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="graduationYear">Graduation Year *</Label>
                    <Input
                      id="graduationYear"
                      type="number"
                      min="2024"
                      max="2030"
                      value={formData.graduationYear}
                      onChange={(e) => handleChange("graduationYear", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="weightClass">Weight Class *</Label>
                    <Select
                      value={formData.weightClass}
                      onValueChange={(value) => handleChange("weightClass", value)}
                      disabled={!formData.gender}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.gender ? "Select weight class" : "Select gender first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {weightClassOptions.map((wc) => (
                          <SelectItem key={wc.value} value={wc.value}>
                            {wc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="highSchool">High School *</Label>
                    <Input
                      id="highSchool"
                      value={formData.highSchool}
                      onChange={(e) => handleChange("highSchool", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location (City, State) *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Charlotte, NC"
                    required
                  />
                </div>
              </div>

              {/* Profile Photo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Profile Photo
                </h3>
                <div className="max-w-xs">
                  <PublicImageUpload
                    athleteId="temp-profile"
                    athleteName={`${formData.firstName} ${formData.lastName}`.trim() || "New Athlete"}
                    onUploadComplete={(url) => handleChange("photoUrl", url)}
                  />
                </div>
              </div>

              {/* About You */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  About You
                </h3>
                <div>
                  <Label htmlFor="bio">Biography</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    placeholder="Tell us about yourself, your wrestling journey, and your goals..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="achievements">Achievements & Honors</Label>
                  <Textarea
                    id="achievements"
                    value={formData.achievements}
                    onChange={(e) => handleChange("achievements", e.target.value)}
                    placeholder="List your wrestling achievements, awards, tournament wins, etc."
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="border-t pt-6">
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <h4 className="font-medium mb-2">What happens next?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your profile will be reviewed by our admin team</li>
                    <li>• You'll receive an email notification once approved (usually within 24-48 hours)</li>
                    <li>• Once approved, your profile will be live on the platform</li>
                    <li>• You can update your information anytime through your account</li>
                  </ul>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3 text-lg">
                  {isSubmitting ? "Submitting..." : "Submit Profile for Review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </AuthGuard>
  )
}
