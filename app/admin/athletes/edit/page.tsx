"use client"

/**
 * Admin edit athlete — same pattern as view-profile: static route, id from ?id=, data from GET API.
 * No dynamic segment so the document request always completes; client fetches from /api/admin/athletes/[id].
 */
import { useState, useEffect } from "react"
import { AthleteForm } from "@/components/athlete-form"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { updateAthleteAction } from "@/lib/athlete-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ArrowLeft, Sparkles, GraduationCap } from "lucide-react"
import { AdminCollegeCommitmentWizard } from "@/components/admin-college-commitment-wizard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function EditAthletePage() {
  const [id, setId] = useState("")
  const [athlete, setAthlete] = useState<any>(null)
  const [originalAthlete, setOriginalAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [updatedFields, setUpdatedFields] = useState<string[]>([])
  const [fieldChanges, setFieldChanges] = useState<Record<string, { before: any; after: any }>>({})
  const [saveTimestamp, setSaveTimestamp] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [generatingBio, setGeneratingBio] = useState(false)
  const [editableBio, setEditableBio] = useState("")
  const [editableHeadline, setEditableHeadline] = useState("")
  const [commitmentWizardOpen, setCommitmentWizardOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    const q = new URLSearchParams(window.location.search).get("id")?.trim() ?? ""
    setId(q)
  }, [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    async function fetchAthlete() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/athletes/${encodeURIComponent(id)}`, { credentials: "include" })
        const result = await res.json().catch(() => ({}))
        if (!res.ok || !result.success) {
          throw new Error(result.error || "Athlete not found")
        }
        setAthlete(result.data)
        setOriginalAthlete(JSON.parse(JSON.stringify(result.data)))
        setEditableBio(result.data.bio || "")
        setEditableHeadline(result.data.bio_headline || "")
      } catch (error) {
        console.error("Error fetching athlete:", error)
        setError("Failed to load athlete data. Please try again or check the debug page.")
        toast({
          title: "Error",
          description: "Failed to load athlete data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchAthlete()
  }, [id, toast])

  const handleGenerateBio = async () => {
    try {
      setGeneratingBio(true)
      const response = await fetch(`/api/athletes/${id}/generate-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("Failed to generate bio")
      const data = await response.json()
      setAthlete((prev) => ({ ...prev, bio: data.bio, bio_headline: data.headline }))
      setEditableBio(data.bio)
      setEditableHeadline(data.headline)
      toast({ title: "Success", description: "AI bio and headline generated successfully!" })
    } catch (error) {
      console.error("Error generating bio:", error)
      toast({ title: "Error", description: "Failed to generate bio. Please try again.", variant: "destructive" })
    } finally {
      setGeneratingBio(false)
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      setSaveSuccess(false)
      setUpdatedFields([])
      setFieldChanges({})
      setDebugInfo(null)
      setSaveTimestamp(null)
      const requiredFields = ["firstName", "lastName", "gender"]
      const missingFields = requiredFields.filter((field) => !data[field])
      if (missingFields.length > 0) {
        if (data.name && (missingFields.includes("firstName") || missingFields.includes("lastName"))) {
          const nameParts = data.name.split(" ")
          if (nameParts.length >= 2) {
            if (!data.firstName) data.firstName = nameParts[0]
            if (!data.lastName) data.lastName = nameParts.slice(1).join(" ")
          }
        }
        if (missingFields.includes("gender")) data.gender = "Male"
      }
      if (data.achievements && typeof data.achievements === "string") {
        data.achievements = data.achievements.split(",").map((item: string) => item.trim()).filter(Boolean)
      }
      if (editableBio !== undefined) data.bio = editableBio
      if (editableHeadline !== undefined) data.bio_headline = editableHeadline

      const result = await updateAthleteAction(id, data)
      if (!result.success) throw new Error(result.error || "Failed to update athlete")

      setSaveSuccess(true)
      setSaveTimestamp(new Date().toLocaleString())
      setAthlete(result.data)
      setOriginalAthlete(JSON.parse(JSON.stringify(result.data)))
      if (result.data) {
        setEditableBio(result.data.bio || "")
        setEditableHeadline(result.data.bio_headline || "")
      }
      toast({ title: "Success", description: `${data.firstName} ${data.lastName} updated successfully` })
      router.refresh()
    } catch (error) {
      console.error("Error updating athlete:", error)
      toast({
        title: "Error updating athlete",
        description: error instanceof Error ? error.message : "There was an error updating the athlete. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#f4f6fa] to-[#e8edf4]">
        <div className="bg-gradient-to-r from-[#002147] via-[#002952] to-[#003366] text-white shadow-xl border-b-4 border-[#c9a227]">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Edit Athlete</h1>
            <p className="text-blue-200">Loading athlete data...</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B31B1B] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading athlete data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#f4f6fa] to-[#e8edf4]">
        <div className="bg-gradient-to-r from-[#002147] via-[#002952] to-[#003366] text-white shadow-xl border-b-4 border-[#c9a227]">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Edit Athlete</h1>
            <p className="text-blue-200">Missing athlete id</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Use ?id= athlete-uuid. Open from Admin → Athletes → Edit.</p>
            <Button variant="outline" asChild className="hover:bg-[#002147] hover:text-white">
              <a href="/admin/athletes">Back to Athletes</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#f4f6fa] to-[#e8edf4]">
        <div className="bg-gradient-to-r from-[#002147] via-[#002952] to-[#003366] text-white shadow-xl border-b-4 border-[#c9a227]">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Edit Athlete</h1>
            <p className="text-blue-200">Error loading athlete</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-4">
            <Button onClick={() => router.refresh()} className="bg-[#B31B1B] hover:bg-[#8B1515]">Try Again</Button>
            <Button variant="outline" asChild className="hover:bg-[#002147] hover:text-white">
              <a href={`/debug/athlete-form/${id}`}>Debug Athlete Data</a>
            </Button>
            <Button variant="outline" asChild className="hover:bg-[#002147] hover:text-white">
              <a href="/admin/athletes">Back to Athletes</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#f4f6fa] to-[#e8edf4]">
        <div className="bg-gradient-to-r from-[#002147] via-[#002952] to-[#003366] text-white shadow-xl border-b-4 border-[#c9a227]">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Edit Athlete</h1>
            <p className="text-blue-200">Athlete not found</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Athlete not found</p>
            <Button variant="outline" asChild className="hover:bg-[#002147] hover:text-white">
              <a href="/admin/athletes">Back to Athletes</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#f4f6fa] to-[#e8edf4]">
      <div className="bg-gradient-to-r from-[#002147] via-[#002952] to-[#003366] text-white shadow-xl border-b-4 border-[#c9a227]">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin/athletes")} className="bg-white/15 text-white border-white/60 hover:bg-white/25 hover:border-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Athletes
              </Button>
              <div>
                <p className="text-[#f0d77a] text-xs font-semibold uppercase tracking-widest mb-1">RecruitNC Admin</p>
                <h1 className="text-3xl md:text-4xl font-bold mb-1 tracking-tight">Athlete profile</h1>
                <p className="text-blue-100 text-lg font-medium">{athlete.name}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:justify-end">
              <Button
                type="button"
                size="sm"
                className="bg-[#f0d77a] text-[#002147] hover:bg-[#e8cf63] font-semibold shadow-md border-0 gap-1.5"
                onClick={() => setCommitmentWizardOpen(true)}
              >
                <GraduationCap className="h-4 w-4" />
                College commitment
              </Button>
              <Button variant="outline" size="sm" asChild className="bg-white text-[#002147] border-white hover:bg-[#f8f6f0]">
                <a href={`/admin/athletes/images/${id}`}>Upload Images</a>
              </Button>
              <Button variant="outline" size="sm" asChild className="bg-white text-[#002147] border-white hover:bg-[#f8f6f0]">
                <a href={`/view-profile?id=${encodeURIComponent(id)}`}>View profile</a>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {athlete.highschool && <Badge className="bg-[#002147]/40 text-white border border-white/25 px-3 py-0.5">{athlete.highschool}</Badge>}
            {athlete.graduationyear && <Badge className="bg-[#002147]/40 text-white border border-white/25 px-3 py-0.5">Class of {athlete.graduationyear}</Badge>}
            {athlete.weightclass && <Badge className="bg-[#002147]/40 text-white border border-white/25 px-3 py-0.5">{athlete.weightclass} lbs</Badge>}
            {athlete.recruiting_status && (
              <Badge className={`${athlete.recruiting_status?.toLowerCase() === "committed" || athlete.recruiting_status?.toLowerCase() === "college athlete" ? "bg-emerald-600/90" : athlete.recruiting_status?.toLowerCase() === "uncommitted" ? "bg-[#c9a227] text-[#002147]" : "bg-white/20"} text-white border-0 px-3 py-0.5`}>
                {athlete.recruiting_status}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <p className="text-xs text-[#002147]/50 mb-4">
          <a href={`/debug/athlete-form/${id}`} className="underline underline-offset-2 hover:text-[#002147]">
            Debug / raw data
          </a>
        </p>
        <Card className="mb-8 overflow-hidden rounded-2xl shadow-lg border border-[#002147]/12 border-t-4 border-t-[#B31B1B] bg-white">
          <CardHeader className="bg-gradient-to-br from-[#002147] via-[#002952] to-[#003366] text-white pb-5">
            <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-[#f0d77a]" />AI bio &amp; headline</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div>
                <p className="text-gray-700 mb-2 font-medium">Generate a compelling bio and headline based on this athlete&apos;s achievements and data</p>
                <p className="text-sm text-gray-600">AI will analyze tournament results, academics, and achievements to create a professional summary</p>
              </div>
              <Button onClick={handleGenerateBio} disabled={generatingBio} className="bg-[#B31B1B] hover:bg-[#8B1515] text-white whitespace-nowrap">
                <Sparkles className="h-4 w-4 mr-2" />{generatingBio ? "Generating..." : "Generate AI Bio"}
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="headline" className="text-sm font-medium text-gray-700">Headline (Format: &quot;Name, High School — Achievements&quot;)</Label>
                <Input id="headline" value={editableHeadline} onChange={(e) => setEditableHeadline(e.target.value)} placeholder="Tobin McNair, Wakefield HS — State Champion & NHSCA All-American" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio (Editable - Note: Regenerating will overwrite manual edits)</Label>
                <Textarea id="bio" value={editableBio} onChange={(e) => setEditableBio(e.target.value)} placeholder="Enter athlete bio..." rows={4} className="mt-1" />
                <p className="text-xs text-gray-500 mt-1">Save using &quot;Save Changes&quot; at the bottom of the page</p>
              </div>
            </div>
            {(athlete.bio || athlete.bio_headline) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-[#002147]/5 to-[#003366]/5 rounded-lg border border-[#002147]/20">
                <h4 className="font-semibold text-[#002147] mb-2">Current Profile:</h4>
                {athlete.bio_headline && <div className="mb-2"><span className="text-sm text-[#002147] font-medium">Headline:</span><p className="text-gray-700 font-semibold">{athlete.bio_headline}</p></div>}
                {athlete.bio && <div><span className="text-sm text-[#002147] font-medium">Bio:</span><p className="text-gray-700 leading-relaxed">{athlete.bio}</p></div>}
              </div>
            )}
          </CardContent>
        </Card>
        {saveSuccess && (
          <Alert className="mb-8 rounded-xl border-2 border-[#c9a227]/50 bg-gradient-to-r from-[#fef9ec] to-white shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-[#002147]" />
            <AlertTitle className="text-[#002147] font-semibold">Saved</AlertTitle>
            <AlertDescription className="text-gray-700">
              {saveTimestamp && <p className="text-sm mb-2 font-medium">Last saved: {saveTimestamp}</p>}
              {updatedFields.length > 0 ? (
                <>
                  <p className="mb-2">Updated fields:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {updatedFields.map((field) => (
                      <Badge key={field} className="bg-[#002147] text-white border-0">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p>All athlete information was saved successfully.</p>
              )}
            </AlertDescription>
          </Alert>
        )}
        <AthleteForm onSubmit={handleSubmit} initialData={athlete} />
        {saveSuccess && (
          <Card className="mt-8 overflow-hidden rounded-2xl border border-[#002147]/10 shadow-md">
            <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] text-white py-4">
              <CardTitle className="text-lg font-semibold">Validation summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-700 font-medium">All required fields are valid and data was saved successfully.</p>
              {Object.keys(fieldChanges).length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="font-semibold text-[#002147] text-sm uppercase tracking-wide">Changed fields</h3>
                  {Object.entries(fieldChanges).map(([field, values]: [string, any]) => (
                    <div key={field} className="rounded-xl border border-[#002147]/10 bg-[#f8fafc] p-4 flex flex-col gap-2 sm:flex-row sm:gap-6">
                      <span className="font-semibold text-[#002147] sm:min-w-[140px]">{field}</span>
                      <div className="flex-1 space-y-2 text-sm">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase">Before</span>
                          <p className="text-gray-600">{typeof values.before === "object" ? JSON.stringify(values.before) : String(values.before)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-[#B31B1B] uppercase">After</span>
                          <p className="text-[#002147] font-medium">{typeof values.after === "object" ? JSON.stringify(values.after) : String(values.after)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild className="border-[#002147]/30 text-[#002147] hover:bg-[#002147]/5">
                  <a href={`/view-profile?id=${encodeURIComponent(id)}`}>View profile</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <AdminCollegeCommitmentWizard
          open={commitmentWizardOpen}
          onOpenChange={setCommitmentWizardOpen}
          athleteId={id}
          athlete={athlete}
          headlineDraft={editableHeadline}
          bioDraft={editableBio}
          onSaved={(data) => {
            setAthlete(data)
            setOriginalAthlete(JSON.parse(JSON.stringify(data)))
            setEditableBio(data.bio || "")
            setEditableHeadline(data.bio_headline || "")
            router.refresh()
          }}
        />
        {debugInfo && (
          <Card className="mt-6 shadow-sm border-t-4 border-t-gray-400">
            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="text-gray-800 text-lg font-semibold">Debug Information</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))} className="hover:bg-gray-300">Copy to Clipboard</Button>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded border">{JSON.stringify(debugInfo, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
