"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const HS_WEIGHT_CLASSES = {
  Male: ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"],
  Female: ["101", "109", "116", "123", "130", "136", "143", "155", "170", "191"],
}

export default function SubmitProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    graduationYear: "",
    weightClass: "",
    highSchool: "",
    wrestlingClub: "",
    location: "",
    email: "",
    phone: "",
    bio: "",
    achievements: "",
    stateQualifier: "",
    regionalPlacer: "",
    conferencePlacer: "",
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
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/athlete-profile-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to submit profile")
      }

      setSubmitted(true)
      toast({
        title: "Profile submitted!",
        description: "Your athlete profile has been submitted for review. We'll review it within 2-3 business days.",
      })
    } catch (error) {
      console.error("Error submitting profile:", error)
      toast({
        title: "Submission failed",
        description: "There was an error submitting your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-900">Profile Submitted Successfully!</CardTitle>
                <CardDescription className="text-green-700">
                  Thank you for submitting your athlete profile
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-800">
              Your profile for{" "}
              <strong>
                {formData.firstName} {formData.lastName}
              </strong>{" "}
              has been submitted and is now pending review by our admin team.
            </p>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <span>Our team will review your submission within 2-3 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <span>If approved, the profile will be published to our prospects page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <span>You'll receive an email notification once the profile is live</span>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Link href="/prospects">
              <Button>View Prospects</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const weightClassOptions = formData.gender
    ? HS_WEIGHT_CLASSES[formData.gender as keyof typeof HS_WEIGHT_CLASSES] || []
    : []

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Athlete Profile</CardTitle>
          <CardDescription>
            Submit a new wrestler profile to be added to our North Carolina wrestling prospects database. All
            submissions are reviewed by our admin team before being published.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Note:</strong> All fields marked with * are required. Your submission will be reviewed by our
                admin team within 2-3 business days.
              </AlertDescription>
            </Alert>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleSelectChange("gender", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graduationYear">
                    Graduation Year <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.graduationYear}
                    onValueChange={(value) => handleSelectChange("graduationYear", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                      <SelectItem value="2029">2029</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightClass">
                  Weight Class <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.weightClass}
                  onValueChange={(value) => handleSelectChange("weightClass", value)}
                  required
                  disabled={!formData.gender}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.gender ? "Select weight class" : "Select gender first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {weightClassOptions.map((wc) => (
                      <SelectItem key={wc} value={wc}>
                        {wc} lbs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* School & Club Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">School & Club Information</h3>

              <div className="space-y-2">
                <Label htmlFor="highSchool">
                  High School <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="highSchool"
                  name="highSchool"
                  value={formData.highSchool}
                  onChange={handleChange}
                  placeholder="Enter high school name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wrestlingClub">Wrestling Club</Label>
                <Input
                  id="wrestlingClub"
                  name="wrestlingClub"
                  value={formData.wrestlingClub}
                  onChange={handleChange}
                  placeholder="Enter wrestling club name (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State (optional)"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We'll use this email to notify you when your profile is approved
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567 (optional)"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="bio">Athlete Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Brief bio about the athlete (optional)"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="achievements">Achievements & Awards</Label>
                <Textarea
                  id="achievements"
                  name="achievements"
                  value={formData.achievements}
                  onChange={handleChange}
                  placeholder="List notable achievements, tournament placements, awards, etc. (optional)"
                  rows={4}
                />
              </div>
            </div>

            {/* Regional & Conference Achievements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Regional & Conference Achievements</h3>
              <p className="text-sm text-muted-foreground">
                These achievements help showcase athletes who may not be state/national placers but are still college
                prospects
              </p>

              <div className="space-y-2">
                <Label htmlFor="stateQualifier">State Qualifier</Label>
                <Textarea
                  id="stateQualifier"
                  name="stateQualifier"
                  value={formData.stateQualifier}
                  onChange={handleChange}
                  placeholder="List years qualified for state tournament (e.g., 2024, 2025)"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Qualified for NCHSAA State Championships</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regionalPlacer">Regional Achievements</Label>
                <Textarea
                  id="regionalPlacer"
                  name="regionalPlacer"
                  value={formData.regionalPlacer}
                  onChange={handleChange}
                  placeholder="List regional placements (e.g., 2024 Regional Champion, 2025 Regional Runner-up, 2023 3rd Place Regional)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Regional qualifier, placer, runner-up, or champion achievements
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conferencePlacer">Conference Achievements</Label>
                <Textarea
                  id="conferencePlacer"
                  name="conferencePlacer"
                  value={formData.conferencePlacer}
                  onChange={handleChange}
                  placeholder="List conference placements (e.g., 2024 Conference Champion, 2025 Conference Runner-up, 2023 3rd Place Conference)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Conference placer, runner-up, or champion achievements</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Link href="/">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Profile"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
