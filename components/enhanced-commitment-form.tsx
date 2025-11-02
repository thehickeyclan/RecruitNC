"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload } from "lucide-react"

interface Entity {
  name: string
  type: "highschool" | "college" | "club"
}

export function EnhancedCommitmentForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    graduationYear: "",
    gender: "",
    weightClass: "",
    highSchool: "",
    club: "",
    college: "",
    achievements: "",
    notes: "",
    athleteImageUrl: "",
    instagramHandle: "",
    commitmentAnnouncementUrl: "",
    commitPictureUrl: "",
  })

  const [entities, setEntities] = useState<Entity[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Update entities when school fields change
    if (field === "highSchool" || field === "college" || field === "club") {
      updateEntities({ ...formData, [field]: value })
    }
  }

  const updateEntities = (data: typeof formData) => {
    const newEntities: Entity[] = []

    if (data.highSchool.trim()) {
      newEntities.push({ name: data.highSchool.trim(), type: "highschool" })
    }
    if (data.college.trim()) {
      newEntities.push({ name: data.college.trim(), type: "college" })
    }
    if (data.club.trim()) {
      newEntities.push({ name: data.club.trim(), type: "club" })
    }

    setEntities(newEntities)
    console.log("Entities Count:", newEntities.length)
    console.log("Entities:", newEntities)
  }

  const handleCommitPictureUpload = async (file: File) => {
    try {
      console.log("[v0] Starting commit picture upload:", file.name)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "commit-pictures")
      formData.append("name", `${formData.firstName}-${formData.lastName}-commit`)

      const response = await fetch("/api/blob-upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Upload successful:", result.url)
        setFormData((prev) => ({ ...prev, commitPictureUrl: result.url }))
      } else {
        console.error("[v0] Upload failed:", response.statusText)
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      const submissionData = {
        ...formData,
        entities,
        submittedAt: new Date().toISOString(),
      }

      console.log("Submitting form data:", submissionData)

      const response = await fetch("/api/submit-commitment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      })

      const result = await response.json()
      console.log("Submit response:", result)

      if (response.ok && result.success) {
        setSubmitResult({ success: true, message: result.message })
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          graduationYear: "",
          gender: "",
          weightClass: "",
          highSchool: "",
          club: "",
          college: "",
          achievements: "",
          notes: "",
          athleteImageUrl: "",
          instagramHandle: "",
          commitmentAnnouncementUrl: "",
          commitPictureUrl: "",
        })
        setEntities([])
      } else {
        setSubmitResult({ error: result.error || "Failed to submit commitment" })
      }
    } catch (error) {
      console.error("Submit error:", error)
      setSubmitResult({ error: "Network error - please try again" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.graduationYear &&
    formData.gender &&
    formData.highSchool &&
    formData.college

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit New Commitment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="graduationYear">Graduation Year *</Label>
                <Select
                  value={formData.graduationYear}
                  onValueChange={(value) => handleInputChange("graduationYear", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
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
                <Label htmlFor="weightClass">Weight Class</Label>
                <Input
                  id="weightClass"
                  value={formData.weightClass}
                  onChange={(e) => handleInputChange("weightClass", e.target.value)}
                  placeholder="e.g., 165"
                />
              </div>
            </div>

            {/* Schools */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="highSchool">High School *</Label>
                <Input
                  id="highSchool"
                  value={formData.highSchool}
                  onChange={(e) => handleInputChange("highSchool", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="club">Wrestling Club (Optional)</Label>
                <Input id="club" value={formData.club} onChange={(e) => handleInputChange("club", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="college">College *</Label>
                <Input
                  id="college"
                  value={formData.college}
                  onChange={(e) => handleInputChange("college", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Social Media and Announcement Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="instagramHandle">Instagram Handle</Label>
                <Input
                  id="instagramHandle"
                  value={formData.instagramHandle}
                  onChange={(e) => handleInputChange("instagramHandle", e.target.value)}
                  placeholder="@username or instagram.com/username"
                />
                <p className="text-sm text-gray-500 mt-1">Optional - helps verify your identity</p>
              </div>
              <div>
                <Label htmlFor="commitmentAnnouncementUrl">Commitment Announcement Link</Label>
                <Input
                  id="commitmentAnnouncementUrl"
                  value={formData.commitmentAnnouncementUrl}
                  onChange={(e) => handleInputChange("commitmentAnnouncementUrl", e.target.value)}
                  placeholder="Any link format: twitter.com/..., instagram.com/..., etc."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Link to your commitment announcement post (any format accepted)
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <Label htmlFor="achievements">Achievements</Label>
              <Textarea
                id="achievements"
                value={formData.achievements}
                onChange={(e) => handleInputChange("achievements", e.target.value)}
                placeholder="State championships, notable wins, etc."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional information"
                rows={3}
              />
            </div>

            {/* Commit Announcement Picture */}
            {entities.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Commit Announcement Picture</CardTitle>
                  <p className="text-sm text-blue-700">Upload a picture from your commitment announcement (optional)</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {formData.commitPictureUrl && (
                      <div className="mb-4">
                        <img
                          src={formData.commitPictureUrl || "/placeholder.svg"}
                          alt="Commit announcement"
                          className="max-w-full h-32 object-cover rounded-lg"
                        />
                        <p className="text-sm text-green-600 mt-2">✓ Picture uploaded successfully</p>
                      </div>
                    )}
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-4 text-blue-500" />
                          <p className="mb-2 text-sm text-blue-600">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-blue-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleCommitPictureUpload(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Result */}
            {submitResult && (
              <Alert className={submitResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <AlertDescription>{submitResult.success ? submitResult.message : submitResult.error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Commitment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
