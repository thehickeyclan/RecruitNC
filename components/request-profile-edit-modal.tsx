"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Info } from "lucide-react"

interface RequestProfileEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId: string
  athleteName: string
  currentUserEmail?: string
}

export function RequestProfileEditModal({
  open,
  onOpenChange,
  athleteId,
  athleteName,
  currentUserEmail,
}: RequestProfileEditModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  console.log("[v0] RequestProfileEditModal rendered - open:", open, "athleteId:", athleteId)

  // Bio fields
  const [highSchool, setHighSchool] = useState("")
  const [club, setClub] = useState("")
  const [weight, setWeight] = useState("")
  const [cellNumber, setCellNumber] = useState("")
  const [highlightVideo, setHighlightVideo] = useState("")
  const [bioOther, setBioOther] = useState("")

  // Achievements
  const [achievements, setAchievements] = useState("")

  // Academics
  const [gpa, setGpa] = useState("")
  const [sat, setSat] = useState("")
  const [act, setAct] = useState("")

  // Other
  const [other, setOther] = useState("")

  // Contact info for validation (required if not logged in)
  const [reporterName, setReporterName] = useState("")
  const [reporterEmail, setReporterEmail] = useState(currentUserEmail || "")

  const handleSubmit = async () => {
    try {
      console.log("[v0] Edit request form submitted")
      setSubmitting(true)

      const descriptionParts: string[] = []

      if (highSchool) descriptionParts.push(`High School: ${highSchool}`)
      if (club) descriptionParts.push(`Wrestling Club: ${club}`)
      if (weight) descriptionParts.push(`Weight Class: ${weight}`)
      if (cellNumber) descriptionParts.push(`Cell Number: ${cellNumber}`)
      if (highlightVideo) descriptionParts.push(`Highlight Video: ${highlightVideo}`)
      if (bioOther) descriptionParts.push(`Bio Info: ${bioOther}`)
      if (achievements) descriptionParts.push(`Achievements: ${achievements}`)
      if (gpa) descriptionParts.push(`GPA: ${gpa}`)
      if (sat) descriptionParts.push(`SAT: ${sat}`)
      if (act) descriptionParts.push(`ACT: ${act}`)
      if (other) descriptionParts.push(`Other: ${other}`)

      const description = descriptionParts.join(" | ")

      if (!description) {
        toast({
          title: "No Changes",
          description: "Please fill in at least one field to submit an edit request.",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }

      // Validate contact info if not logged in
      if (!currentUserEmail) {
        if (!reporterName || !reporterName.trim()) {
          toast({
            title: "Name Required",
            description: "Please provide your name so we can track this request.",
            variant: "destructive",
          })
          setSubmitting(false)
          return
        }
        if (!reporterEmail || !reporterEmail.trim() || !reporterEmail.includes("@")) {
          toast({
            title: "Valid Email Required",
            description: "Please provide a valid email address so we can contact you about this request.",
            variant: "destructive",
          })
          setSubmitting(false)
          return
        }
      }

      const requestData = {
        athleteId: athleteId, // ✓ Correct field name
        editType: "profile_update", // ✓ Correct field name
        description: description, // ✓ Required field
        currentData: {
          bio: {
            highSchool: highSchool || null,
            club: club || null,
            weight: weight || null,
            cellNumber: cellNumber || null,
            highlightVideo: highlightVideo || null,
            other: bioOther || null,
          },
          achievements: achievements || null,
          academics: {
            gpa: gpa || null,
            sat: sat || null,
            act: act || null,
          },
          other: other || null,
        },
        reporterName: reporterName || null,
        reporterEmail: currentUserEmail || reporterEmail || null,
      }

      console.log("[v0] Submitting edit request:", requestData)

      const response = await fetch("/api/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] API error response:", errorData)
        throw new Error(errorData.error || "Failed to submit edit request")
      }

      console.log("[v0] Edit request submitted successfully")

      toast({
        title: "Edit Request Submitted",
        description: "Your profile edit request has been submitted for review.",
      })

      // Reset form
      setHighSchool("")
      setClub("")
      setWeight("")
      setCellNumber("")
      setHighlightVideo("")
      setBioOther("")
      setAchievements("")
      setGpa("")
      setSat("")
      setAct("")
      setOther("")
      setReporterName("")
      setReporterEmail(currentUserEmail || "")

      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error submitting edit request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit edit request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Profile Edit</DialogTitle>
          <DialogDescription>
            Submit changes for {athleteName}'s profile. An admin will review and approve your request.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Only fill in the fields you want to update</p>
            <p className="text-blue-700">
              Leave any fields blank that don't need changes. You don't need to fill out every field—just the ones with
              new or corrected information.
            </p>
          </div>
        </div>

        {/* Contact Information - Required if not logged in */}
        {!currentUserEmail && (
          <div className="space-y-4 border-b pb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Contact Information</h3>
              <p className="text-xs text-gray-600 mb-3">
                We need your name and email to track this request and contact you if we have questions.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reporterName">
                  Your Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reporterName"
                  placeholder="John Doe"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporterEmail">
                  Your Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reporterEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {currentUserEmail && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-900">
              <span className="font-medium">Logged in as:</span> {currentUserEmail}
            </p>
          </div>
        )}

        <Tabs defaultValue="bio" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bio">Bio</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="bio" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="highSchool">High School</Label>
              <Input
                id="highSchool"
                placeholder="Leave blank if no change needed"
                value={highSchool}
                onChange={(e) => setHighSchool(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="club">Wrestling Club</Label>
              <Input
                id="club"
                placeholder="Leave blank if no change needed"
                value={club}
                onChange={(e) => setClub(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight Class</Label>
              <Input
                id="weight"
                placeholder="Leave blank if no change needed"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cellNumber">Cell Phone Number</Label>
              <Input
                id="cellNumber"
                placeholder="Leave blank if no change needed"
                value={cellNumber}
                onChange={(e) => setCellNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="highlightVideo">Highlight Video Link</Label>
              <Input
                id="highlightVideo"
                placeholder="Leave blank if no change needed"
                value={highlightVideo}
                onChange={(e) => setHighlightVideo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bioOther">Other Bio Information</Label>
              <Textarea
                id="bioOther"
                placeholder="Leave blank if no change needed"
                value={bioOther}
                onChange={(e) => setBioOther(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="achievements">Latest Wins & Accolades</Label>
              <Textarea
                id="achievements"
                placeholder="Leave blank if no change needed"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                rows={8}
              />
              <p className="text-sm text-gray-500">
                Include tournament names, placements, records, and any notable victories
              </p>
            </div>
          </TabsContent>

          <TabsContent value="academics" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                placeholder="Leave blank if no change needed"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sat">SAT Score</Label>
              <Input
                id="sat"
                placeholder="Leave blank if no change needed"
                value={sat}
                onChange={(e) => setSat(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="act">ACT Score</Label>
              <Input
                id="act"
                placeholder="Leave blank if no change needed"
                value={act}
                onChange={(e) => setAct(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="other">Additional Information</Label>
              <Textarea
                id="other"
                placeholder="Leave blank if no change needed"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                rows={8}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
