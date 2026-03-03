"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Upload, Trophy, User, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Athlete {
  id: string
  first_name?: string
  last_name?: string
  name?: string
  high_school?: string
  college?: string
  weight_class?: string
  achievements?: string[]
  image_url?: string
  graduation_year?: number
  division?: string
  wrestling_club?: string
}

interface AchievementInput {
  tournament?: string
  placement?: string
  year?: string
  level?: string
  weight_class?: string
  notes?: string
  proof_url?: string
  date?: string
}

interface EditRequestFormProps {
  athlete: Athlete
}

export default function EditRequestForm({ athlete }: EditRequestFormProps) {
  const [editType, setEditType] = useState("")
  const [description, setDescription] = useState("")
  const [bioUpdates, setBioUpdates] = useState("")
  const [academicsUpdates, setAcademicsUpdates] = useState("")
  const [achievementsUpdates, setAchievementsUpdates] = useState("")
  const [submitterEmail, setSubmitterEmail] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [achievements, setAchievements] = useState<AchievementInput[]>([])
  const { toast } = useToast()
  const [showSuccess, setShowSuccess] = useState(false)

  const athleteName = useMemo(
    () => athlete.name || `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim(),
    [athlete.name, athlete.first_name, athlete.last_name],
  )

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a photo under 5MB",
          variant: "destructive",
        })
        return
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }
      setPhotoFile(file)
    }
  }

  const addAchievement = () => {
    setAchievements((prev) => [
      ...prev,
      {
        tournament: "",
        placement: "",
        year: "",
        level: "",
        weight_class: "",
        notes: "",
        proof_url: "",
        date: "",
      },
    ])
  }

  const removeAchievement = (index: number) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index))
  }

  const updateAchievement = <K extends keyof AchievementInput>(index: number, key: K, value: AchievementInput[K]) => {
    setAchievements((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const validateAchievements = () => {
    // At least one meaningful field per row
    const cleaned = achievements
      .map((a) => {
        const trimmed: AchievementInput = {
          tournament: a.tournament?.trim(),
          placement: a.placement?.trim(),
          year: a.year?.trim(),
          level: a.level?.trim(),
          weight_class: a.weight_class?.trim(),
          notes: a.notes?.trim(),
          proof_url: a.proof_url?.trim(),
          date: a.date?.trim(),
        }
        // Remove empty keys
        Object.keys(trimmed).forEach((k) => {
          const key = k as keyof AchievementInput
          if (!trimmed[key]) {
            delete trimmed[key]
          }
        })
        return trimmed
      })
      .filter((a) => Object.keys(a).length > 0)
    return cleaned
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanedAchievements = editType === "achievements" ? validateAchievements() : []

    if (!submitterEmail.trim() || !submitterEmail.includes("@")) {
      toast({
        title: "Email required",
        description: "Please provide a valid email address so we can contact you about this request.",
        variant: "destructive",
      })
      return
    }

    if (editType === "ranked_athlete_update") {
      if (!bioUpdates.trim() && !academicsUpdates.trim() && !achievementsUpdates.trim()) {
        toast({
          title: "Missing information",
          description: "Please provide updates in at least one section (Bio, Academics, or Achievements).",
          variant: "destructive",
        })
        return
      }
    } else if (editType === "achievements") {
      if (cleanedAchievements.length === 0 && !description.trim()) {
        toast({
          title: "Missing information",
          description: "Please add at least one achievement or provide details in the description.",
          variant: "destructive",
        })
        return
      }
    } else {
      if (!editType || !description.trim()) {
        toast({
          title: "Missing information",
          description: "Please select an edit type and provide a description",
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Prepare current data for reference
      const currentData = {
        name: athleteName,
        high_school: athlete.high_school,
        college: athlete.college,
        weight_class: athlete.weight_class,
        achievements: athlete.achievements,
        image_url: athlete.image_url,
        graduation_year: athlete.graduation_year,
        division: athlete.division,
        wrestling_club: athlete.wrestling_club,
      }

      // Convert photo to base64 if provided
      let photoData = null
      if (photoFile) {
        const reader = new FileReader()
        photoData = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(photoFile)
        })
      }

      const response = await fetch("/api/edit-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          athleteId: athlete.id,
          editType,
          description,
          currentData,
          photoFile: photoData,
          achievements: cleanedAchievements,
          bioUpdates: editType === "ranked_athlete_update" ? bioUpdates : undefined,
          academicsUpdates: editType === "ranked_athlete_update" ? academicsUpdates : undefined,
          achievementsUpdates: editType === "ranked_athlete_update" ? achievementsUpdates : undefined,
          reporterEmail: submitterEmail,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Request submitted",
          description: "Your request has been submitted successfully. We'll review it soon!",
        })
        setShowSuccess(true)
        // Reset form
        setEditType("")
        setDescription("")
        setPhotoFile(null)
        setAchievements([])
        setBioUpdates("")
        setAcademicsUpdates("")
        setAchievementsUpdates("")
        setSubmitterEmail("")
        return
      } else {
        throw new Error(result.error || "Failed to submit request")
      }
    } catch (error) {
      console.error("Error submitting edit request:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to submit edit request",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => window.location.href = `/athletes/${athlete.id}`}
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Request Profile Changes</CardTitle>
          <CardDescription>
            Help us keep {athleteName}'s profile accurate by suggesting corrections or requesting new achievements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-gray-900">Current Profile Information:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{athleteName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Graduation Year:</span>
                  <span className="ml-2 text-gray-900">{athlete.graduation_year || "Not specified"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">High School:</span>
                  <span className="ml-2 text-gray-900">{athlete.high_school || "Not specified"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Wrestling Club:</span>
                  <span className="ml-2 text-gray-900">{athlete.wrestling_club || "Not specified"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">College:</span>
                  <span className="ml-2 text-gray-900">{athlete.college || "Not specified"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Weight Class:</span>
                  <span className="ml-2 text-gray-900">{athlete.weight_class || "Not specified"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Division:</span>
                  <span className="ml-2 text-gray-900">{athlete.division || "Not specified"}</span>
                </div>
                {athlete.achievements && Array.isArray(athlete.achievements) && athlete.achievements.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Achievements:</span>
                    <span className="ml-2 text-gray-900">{athlete.achievements.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submitterEmail">Your Email Address *</Label>
              <Input
                id="submitterEmail"
                type="email"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
              <p className="text-sm text-gray-500">
                We'll use this to contact you if we have questions about your request.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editType">What needs to be updated? *</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select what needs to be changed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranked_athlete_update">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Ranked Athlete Profile Update
                    </div>
                  </SelectItem>

                  <SelectItem value="achievements">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Add Achievements
                    </div>
                  </SelectItem>

                  <SelectItem value="personal_info">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Name or Personal Information
                    </div>
                  </SelectItem>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="wrestling_club">Wrestling Club</SelectItem>
                  <SelectItem value="college">College Commitment</SelectItem>
                  <SelectItem value="weight_class">Weight Class</SelectItem>
                  <SelectItem value="graduation_year">Graduation Year</SelectItem>
                  <SelectItem value="photo">Profile Photo</SelectItem>
                  <SelectItem value="match_record">Match Record/Stats</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editType === "ranked_athlete_update" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>For Ranked Athletes:</strong> Use the sections below to request updates to your profile.
                    Provide as much detail as possible in each section.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bioUpdates">Bio Updates</Label>
                  <Textarea
                    id="bioUpdates"
                    value={bioUpdates}
                    onChange={(e) => setBioUpdates(e.target.value)}
                    placeholder="Update your bio information including high school, wrestling club, weight class, etc.&#10;&#10;Example:&#10;- High School: Changed from ABC High to XYZ High&#10;- Wrestling Club: Now training with Elite Wrestling Club&#10;- Weight Class: Moved up to 152 lbs"
                    rows={6}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicsUpdates">Academics Updates</Label>
                  <Textarea
                    id="academicsUpdates"
                    value={academicsUpdates}
                    onChange={(e) => setAcademicsUpdates(e.target.value)}
                    placeholder="Update your academic information including GPA, SAT, ACT, academic interests, intended major, etc.&#10;&#10;Example:&#10;- GPA: 3.8 (updated from 3.6)&#10;- SAT: 1350&#10;- ACT: 29&#10;- Academic Interest: Engineering&#10;- Intended Major: Mechanical Engineering"
                    rows={6}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="achievementsUpdates">Achievements Updates</Label>
                  <Textarea
                    id="achievementsUpdates"
                    value={achievementsUpdates}
                    onChange={(e) => setAchievementsUpdates(e.target.value)}
                    placeholder="Add new tournament results, ranked wins, state championships, national placements, etc.&#10;&#10;Example:&#10;- NCHSAA 3A State Champion 2025 (152 lbs)&#10;- NHSCA Nationals: 5th place (2025)&#10;- Ranked Win: Defeated #8 John Smith at Super 32&#10;- College Opens: 3rd place at Virginia Tech Open"
                    rows={8}
                    className="min-h-[160px]"
                  />
                </div>

                <p className="text-sm text-gray-500">
                  Fill out any sections that need updates. You don't need to fill out all three - just the ones that
                  have changed.
                </p>
              </div>
            )}

            {editType === "achievements" && (
              <div className="space-y-3">
                <Label>Achievements to Add</Label>
                <p className="text-sm text-gray-500">
                  Add tournaments, placements, and years. Include proof links when possible (brackets, official results,
                  media).
                </p>

                {achievements.length === 0 && (
                  <div className="rounded-md border border-dashed p-4 text-sm text-gray-600">
                    No achievements added yet. Click "Add Achievement" to get started.
                  </div>
                )}

                <div className="space-y-4">
                  {achievements.map((a, idx) => (
                    <div key={idx} className="rounded-lg border p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Achievement #{idx + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeAchievement(idx)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Remove achievement ${idx + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`tournament-${idx}`}>Tournament</Label>
                          <Input
                            id={`tournament-${idx}`}
                            value={a.tournament || ""}
                            onChange={(e) => updateAchievement(idx, "tournament", e.target.value)}
                            placeholder="e.g., State Championships"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`placement-${idx}`}>Placement</Label>
                          <Input
                            id={`placement-${idx}`}
                            value={a.placement || ""}
                            onChange={(e) => updateAchievement(idx, "placement", e.target.value)}
                            placeholder="e.g., 1st, 3rd, Finalist"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`year-${idx}`}>Year</Label>
                          <Input
                            id={`year-${idx}`}
                            value={a.year || ""}
                            onChange={(e) => updateAchievement(idx, "year", e.target.value)}
                            placeholder="e.g., 2024"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`level-${idx}`}>Level</Label>
                          <Input
                            id={`level-${idx}`}
                            value={a.level || ""}
                            onChange={(e) => updateAchievement(idx, "level", e.target.value)}
                            placeholder="e.g., HS Varsity, National"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`wc-${idx}`}>Weight Class</Label>
                          <Input
                            id={`wc-${idx}`}
                            value={a.weight_class || ""}
                            onChange={(e) => updateAchievement(idx, "weight_class", e.target.value)}
                            placeholder="e.g., 145"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`date-${idx}`}>Event Date</Label>
                          <Input
                            id={`date-${idx}`}
                            value={a.date || ""}
                            onChange={(e) => updateAchievement(idx, "date", e.target.value)}
                            placeholder="YYYY-MM-DD (optional)"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`proof-${idx}`}>Proof Link</Label>
                          <Input
                            id={`proof-${idx}`}
                            value={a.proof_url || ""}
                            onChange={(e) => updateAchievement(idx, "proof_url", e.target.value)}
                            placeholder="https://... (brackets, results, news, etc.)"
                            type="url"
                            inputMode="url"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`notes-${idx}`}>Notes</Label>
                          <Input
                            id={`notes-${idx}`}
                            value={a.notes || ""}
                            onChange={(e) => updateAchievement(idx, "notes", e.target.value)}
                            placeholder="Any additional context"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAchievement}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Plus className="h-4 w-4" />
                    Add Achievement
                  </Button>
                </div>
              </div>
            )}

            {editType === "photo" && (
              <div className="space-y-2">
                <Label htmlFor="photo">Upload New Photo</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
                {photoFile && <p className="text-sm text-green-600 font-medium">✓ Selected: {photoFile.name}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">
                {editType === "photo"
                  ? "Additional notes about the photo (optional)"
                  : "Describe the changes (optional for Achievements, required for other types)"}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  editType === "achievements"
                    ? "Optionally add context for these achievements (division, bracket details, etc.)..."
                    : editType === "personal_info"
                      ? "Please specify what personal information needs to be corrected (name spelling, graduation year, etc.)..."
                      : editType === "college"
                        ? "Please provide details about the college commitment (school name, date, etc.)..."
                        : "Please provide specific details about what needs to be changed and what the correct information should be..."
                }
                rows={4}
                required={editType !== "achievements" && editType !== "photo"}
                className="min-h-[100px]"
              />
              <p className="text-sm text-gray-500">
                {editType === "achievements"
                  ? "Add at least one achievement row or include details here to help us verify and add the results."
                  : "Be as specific as possible to help us make accurate updates"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#B31B1B] hover:bg-[#a50d25] text-white flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Request...
                  </>
                ) : (
                  "Submit Edit Request"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = `/athletes/${athlete.id}`}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Request Submitted</DialogTitle>
            <DialogDescription>
              Thanks! We received your request and will review it shortly. You’ll see updates on the profile once
              approved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setShowSuccess(false)}>
              Close
            </Button>
            <Button
              onClick={() => window.location.href = `/athletes/${athlete.id}`}
              className="bg-[#B31B1B] hover:bg-[#a50d25] text-white"
            >
              Return to Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
