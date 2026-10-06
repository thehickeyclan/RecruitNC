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
  /** The athlete who claimed this profile, or a linked parent. Their field edits save directly. */
  isOwner?: boolean
}

export function RequestProfileEditModal({
  open,
  onOpenChange,
  athleteId,
  athleteName,
  currentUserEmail,
  isOwner = false,
}: RequestProfileEditModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async () => {
    try {
      console.log("[v0] Edit request form submitted")
      setSubmitting(true)

      /**
       * The family's own fields do not need anyone's approval.
       *
       * Weight already saved straight through, for anyone. For the athlete who owns the profile
       * or a linked parent, so now does everything else on this form that is a plain profile
       * field: school, club, phone, highlight video, GPA, SAT, ACT. The Academics card's inline
       * editor already wrote GPA directly, but the pencil on the photo opens this form, and a
       * wrestler who typed a GPA here was told it was "waiting for confirmation" — Jake McCord,
       * September 2026. Only the free-text boxes (achievements, other notes) stay queued: the
       * tournament record is ours to import, and free text there is a claim, not a field.
       */
      const direct: Record<string, unknown> = {}
      /** Which boxes went live, so only the rest are queued. */
      const live = new Set<string>()
      if (weight.trim()) direct.weightclass = weight.trim()
      if (isOwner) {
        /*
         * Only a value that looks like the field goes live. The queue holds a "High School" box
         * with a paragraph of accolades in it and a GPA written as a sentence; saved directly,
         * those would print on the profile as the school name and as "3.80". Anything that does
         * not fit still goes to review rather than being dropped.
         */
        const score = (raw: string, min: number, max: number) => {
          const v = raw.trim()
          if (!/^\d+(\.\d+)?$/.test(v)) return null
          const n = Number(v)
          return n >= min && n <= max ? n : null
        }
        const shortText = (raw: string) => {
          const v = raw.trim()
          return v && v.length <= 60 ? v : null
        }
        const take = (box: string, column: string, value: unknown) => {
          if (value == null) return
          direct[column] = value
          live.add(box)
        }
        take("gpa", "academic_gpa", score(gpa, 0, 5))
        take("sat", "academic_sat", score(sat, 400, 1600))
        take("act", "academic_act", score(act, 1, 36))
        take("highSchool", "highschool", shortText(highSchool))
        // "wrestlingClub": the lowercase spelling is not a column, so self-edit dropped it while
        // this form told the family the change was live.
        take("club", "wrestlingClub", shortText(club))
        take("cellNumber", "cell", /^[\d\s().+-]{7,20}$/.test(cellNumber.trim()) ? cellNumber.trim() : null)
        take("highlightVideo", "highlight_video_url", /^https?:\/\/\S+$/i.test(highlightVideo.trim()) ? highlightVideo.trim() : null)
        // Their own bio is theirs to write - Coy Deel's sat in an approval queue for a day.
        take("bio", "bio", bioOther.trim() && bioOther.trim().length <= 3000 ? bioOther.trim() : null)
      }

      let savedDirectly = false
      if (Object.keys(direct).length > 0) {
        try {
          const res = await fetch(`/api/athletes/${athleteId}/self-edit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: direct }),
          })
          savedDirectly = res.ok
        } catch {
          /** Fall through and queue it like any other field. */
        }
      }
      const weightSavedDirectly = savedDirectly && "weightclass" in direct
      const isLive = (box: string) => savedDirectly && live.has(box)

      const descriptionParts: string[] = []

      if (highSchool && !isLive("highSchool")) descriptionParts.push(`High School: ${highSchool}`)
      if (club && !isLive("club")) descriptionParts.push(`Wrestling Club: ${club}`)
      if (weight && !weightSavedDirectly) descriptionParts.push(`Weight Class: ${weight}`)
      if (cellNumber && !isLive("cellNumber")) descriptionParts.push(`Cell Number: ${cellNumber}`)
      if (highlightVideo && !isLive("highlightVideo")) descriptionParts.push(`Highlight Video: ${highlightVideo}`)
      if (bioOther && !isLive("bio")) descriptionParts.push(`Bio Info: ${bioOther}`)
      if (achievements) descriptionParts.push(`Achievements: ${achievements}`)
      if (gpa && !isLive("gpa")) descriptionParts.push(`GPA: ${gpa}`)
      if (sat && !isLive("sat")) descriptionParts.push(`SAT: ${sat}`)
      if (act && !isLive("act")) descriptionParts.push(`ACT: ${act}`)
      if (other) descriptionParts.push(`Other: ${other}`)

      const description = descriptionParts.join(" | ")

      if (!description) {
        if (savedDirectly) {
          toast({
            title: "Profile Updated",
            description: live.size > 0 ? "Your changes are live." : `Weight class is now ${weight.trim()} lbs.`,
          })
          setSubmitting(false)
          onOpenChange(false)
          window.location.reload()
          return
        }
        toast({
          title: "No Changes",
          description: "Please fill in at least one field to submit an edit request.",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }

      // Note: Since non-logged-in users can't access profile pages, 
      // all requests will come from logged-in users, so contact info is optional

      const requestData = {
        athleteId: athleteId, // ✓ Correct field name
        editType: "profile_update", // ✓ Correct field name
        description: description, // ✓ Required field
        currentData: {
          bio: {
            highSchool: isLive("highSchool") ? null : highSchool || null,
            club: isLive("club") ? null : club || null,
            weight: weightSavedDirectly ? null : weight || null,
            cellNumber: isLive("cellNumber") ? null : cellNumber || null,
            highlightVideo: isLive("highlightVideo") ? null : highlightVideo || null,
            other: bioOther || null,
          },
          achievements: achievements || null,
          academics: {
            gpa: isLive("gpa") ? null : gpa || null,
            sat: isLive("sat") ? null : sat || null,
            act: isLive("act") ? null : act || null,
          },
          other: other || null,
        },
        reporterEmail: currentUserEmail || null,
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
        description: savedDirectly && live.size > 0
          ? "Your changes are live. Anything else you added has been sent to us to review."
          : weightSavedDirectly
            ? `Weight class updated to ${weight.trim()} lbs right away. The rest has been submitted for review.`
            : "Your profile edit request has been submitted for review.",
      })
      if (savedDirectly) window.location.reload()

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
          <DialogTitle>{isOwner ? "Edit Profile" : "Request Profile Edit"}</DialogTitle>
          <DialogDescription>
            {isOwner
              ? `Changes to ${athleteName}'s profile save right away. Only achievements and notes are sent to us to review.`
              : `Submit changes for ${athleteName}'s profile. An admin will review and approve your request.`}
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

        {currentUserEmail && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-900">
              <span className="font-medium">Request will be tracked under:</span> {currentUserEmail}
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
              <p className="text-xs text-muted-foreground">Updates straight away — no approval needed.</p>
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
            {submitting ? "Saving..." : isOwner ? "Save Changes" : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
