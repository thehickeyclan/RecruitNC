"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClubPicker, type PickedClub } from "@/components/clubs/club-picker"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { PublicImageUpload } from "@/components/public-image-upload"

interface Athlete {
  id: string
  name?: string
  firstName?: string
  bio?: string
  bio_headline?: string
  highschool?: string
  high_school?: string
  wrestlingclub?: string
  wrestlingClub?: string
  cell?: string
  cell_number?: string
  phone?: string
  instagram?: string
  instagram_handle?: string
  instagram_username?: string
  academic_gpa?: number
  academic_sat?: number
  academic_act?: number
  achievements?: string[] | string
  additional_achievements?: string
  college_opens_experience?: string
  nationally_ranked_wins?: string
  prospect_ranking?: number
  highlight_video_url?: string | null
  photourl?: string | null
}

export default function AthleteEditPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [athlete, setAthlete] = useState<Athlete | null>(null)

  // Form state
  const [bio, setBio] = useState("")
  const [bioHeadline, setBioHeadline] = useState("")
  const [highSchool, setHighSchool] = useState("")
  const [wrestlingClub, setWrestlingClub] = useState("")
  const [club, setClub] = useState<PickedClub | null>(null)
  const [cell, setCell] = useState("")
  const [instagram, setInstagram] = useState("")
  const [gpa, setGpa] = useState("")
  const [sat, setSat] = useState("")
  const [act, setAct] = useState("")
  const [achievements, setAchievements] = useState("")
  const [additionalAchievements, setAdditionalAchievements] = useState("")
  const [collegeOpens, setCollegeOpens] = useState("")
  const [nationallyRankedWins, setNationallyRankedWins] = useState("")
  const [prospectRanking, setProspectRanking] = useState("")
  const [highlightVideo, setHighlightVideo] = useState("")

  useEffect(() => {
    if (!user) {
      window.location.href = "/auth/signin"
      return
    }

    fetchAthlete()
  }, [params.id, user])

  const fetchAthlete = async () => {
    try {
      const response = await fetch(`/api/athletes/${params.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch athlete")
      }
      const data = await response.json()
      setAthlete(data)
      
      // Populate form fields
      setBio(data.bio || "")
      setBioHeadline(data.bio_headline || "")
      setHighSchool(data.highschool || data.high_school || "")
      setWrestlingClub(data.wrestlingclub || data.wrestlingClub || "")
      if (data.wrestling_club_id) {
        setClub({
          id: String(data.wrestling_club_id),
          name: data.wrestling_club_name || data.wrestlingclub || data.wrestlingClub || "Your club",
          city: data.wrestling_club_city ?? null,
        })
      }
      setCell(data.cell || data.cell_number || data.phone || "")
      setInstagram(data.instagram || data.instagram_handle || data.instagram_username || "")
      setGpa(data.academic_gpa ? String(data.academic_gpa) : "")
      setSat(data.academic_sat ? String(data.academic_sat) : "")
      setAct(data.academic_act ? String(data.academic_act) : "")
      setAchievements(
        Array.isArray(data.achievements) 
          ? data.achievements.join(", ") 
          : data.achievements || ""
      )
      setAdditionalAchievements(data.additional_achievements || "")
      setCollegeOpens(data.college_opens_experience || "")
      setNationallyRankedWins(data.nationally_ranked_wins || "")
      setProspectRanking(data.prospect_ranking ? String(data.prospect_ranking) : "")
      setHighlightVideo(data.highlight_video_url || "")
    } catch (error) {
      console.error("Error fetching athlete:", error)
      toast({
        title: "Error",
        description: "Failed to load athlete profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updates: Record<string, any> = {}

      if (bio !== (athlete?.bio || "")) updates.bio = bio
      if (bioHeadline !== (athlete?.bio_headline || "")) updates.bio_headline = bioHeadline
      if (highSchool !== (athlete?.highschool || athlete?.high_school || "")) updates.highschool = highSchool
      // The picker is the source of truth. wrestlingClub is written alongside so anything
      // still reading the text sees the same club until the migration finishes.
      if (String(club?.id ?? "") !== String(athlete?.wrestling_club_id ?? "")) {
        updates.wrestling_club_id = club ? Number(club.id) : null
        updates.wrestlingClub = club?.name ?? ""
      }
      if (cell !== (athlete?.cell || athlete?.cell_number || athlete?.phone || "")) updates.cell = cell
      if (instagram !== (athlete?.instagram || athlete?.instagram_handle || athlete?.instagram_username || "")) updates.instagram = instagram
      if (gpa !== (athlete?.academic_gpa ? String(athlete.academic_gpa) : "")) updates.academic_gpa = gpa ? parseFloat(gpa) : null
      if (sat !== (athlete?.academic_sat ? String(athlete.academic_sat) : "")) updates.academic_sat = sat ? parseInt(sat) : null
      if (act !== (athlete?.academic_act ? String(athlete.academic_act) : "")) updates.academic_act = act ? parseInt(act) : null
      if (achievements !== (Array.isArray(athlete?.achievements) ? athlete.achievements.join(", ") : athlete?.achievements || "")) {
        updates.achievements = achievements.split(",").map(a => a.trim()).filter(Boolean)
      }
      if (additionalAchievements !== (athlete?.additional_achievements || "")) updates.additional_achievements = additionalAchievements
      if (collegeOpens !== (athlete?.college_opens_experience || "")) updates.college_opens_experience = collegeOpens
      if (nationallyRankedWins !== (athlete?.nationally_ranked_wins || "")) updates.nationally_ranked_wins = nationallyRankedWins
      if (prospectRanking !== (athlete?.prospect_ranking ? String(athlete.prospect_ranking) : "")) {
        updates.prospect_ranking = prospectRanking ? parseInt(prospectRanking) : null
      }
      if (highlightVideo !== (athlete?.highlight_video_url || "")) {
        updates.highlight_video_url = highlightVideo.trim() || null
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made",
        })
        setSaving(false)
        return
      }

      const response = await fetch(`/api/athletes/${params.id}/self-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile")
      }

      toast({
        title: "Success",
        description: `Profile updated successfully. ${data.changes} field(s) changed.`,
      })

      // Refresh athlete data
      await fetchAthlete()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Athlete not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground mt-2">
          Edit your profile information. Changes are saved immediately and can be reviewed by admins.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="highSchool">High School</Label>
              <Input
                id="highSchool"
                value={highSchool}
                onChange={(e) => setHighSchool(e.target.value)}
              />
            </div>
            <div>
              <ClubPicker
                value={club}
                onChange={setClub}
                label="Wrestling club"
                helpText="Pick your club from the list so it links to the club map. Search by nickname too — RAW finds Raleigh Area Wolfpack."
              />
            </div>
            <div>
              <Label htmlFor="cell">Cell Phone</Label>
              <Input
                id="cell"
                value={cell}
                onChange={(e) => setCell(e.target.value)}
                type="tel"
              />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram Handle</Label>
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bioHeadline">Bio Headline</Label>
              <Input
                id="bioHeadline"
                value={bioHeadline}
                onChange={(e) => setBioHeadline(e.target.value)}
                placeholder="Short headline for your bio"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                placeholder="Tell us about yourself..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Academics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                max="5"
              />
            </div>
            <div>
              <Label htmlFor="sat">SAT Score</Label>
              <Input
                id="sat"
                value={sat}
                onChange={(e) => setSat(e.target.value)}
                type="number"
                min="0"
                max="1600"
              />
            </div>
            <div>
              <Label htmlFor="act">ACT Score</Label>
              <Input
                id="act"
                value={act}
                onChange={(e) => setAct(e.target.value)}
                type="number"
                min="0"
                max="36"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Achievements & Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="achievements">Achievements (comma-separated)</Label>
              <Textarea
                id="achievements"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                rows={4}
                placeholder="State Champion 2024, Regional Champion 2023, etc."
              />
            </div>
            <div>
              <Label htmlFor="additionalAchievements">Additional Achievements</Label>
              <Textarea
                id="additionalAchievements"
                value={additionalAchievements}
                onChange={(e) => setAdditionalAchievements(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="collegeOpens">College Opens Experience</Label>
              <Textarea
                id="collegeOpens"
                value={collegeOpens}
                onChange={(e) => setCollegeOpens(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="nationallyRankedWins">Nationally Ranked Wins</Label>
              <Input
                id="nationallyRankedWins"
                value={nationallyRankedWins}
                onChange={(e) => setNationallyRankedWins(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prospectRanking">Prospect Ranking</Label>
              <Input
                id="prospectRanking"
                value={prospectRanking}
                onChange={(e) => setProspectRanking(e.target.value)}
                type="number"
                min="1"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2 mb-6">
          <Label htmlFor="highlight_video_url">Highlight Video URL</Label>
          <Input
            id="highlight_video_url"
            type="url"
            value={highlightVideo}
            onChange={(e) => setHighlightVideo(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
          />
          <p className="text-xs text-gray-500">
            Paste a YouTube link. It will be embedded on your public profile.
          </p>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <PublicImageUpload
          athleteId={params.id}
          athleteName={athlete?.name ?? athlete?.firstName ?? "Athlete"}
          currentImageUrl={athlete?.photourl ?? undefined}
          onUploadComplete={() => fetchAthlete()}
        />
      </div>

      <Card className="mt-6 bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You cannot edit match data, NHSCA results, Super32 results, or records/placements. 
            Please contact an admin for changes to those fields.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

