"use client"

import { useState, useEffect } from "react"
import { AthleteForm } from "@/components/athlete-form"
import { TournamentResultsEditor } from "@/components/tournament-results-editor"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getAthleteByIdAction, updateAthleteAction } from "@/lib/athlete-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function EditAthletePage({ params }: { params: { id: string } }) {
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
  const router = useRouter()
  const { toast } = useToast()
  const { id } = params

  useEffect(() => {
    async function fetchAthlete() {
      try {
        setLoading(true)
        setError(null)

        const result = await getAthleteByIdAction(id)

        if (!result.success) {
          throw new Error(result.error || "Athlete not found")
        }

        console.log("Athlete data loaded:", result.data)

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
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to generate bio")
      }

      const data = await response.json()

      setAthlete((prev) => ({ ...prev, bio: data.bio, bio_headline: data.headline }))
      setEditableBio(data.bio)
      setEditableHeadline(data.headline)

      toast({
        title: "Success",
        description: "AI bio and headline generated successfully!",
      })
    } catch (error) {
      console.error("Error generating bio:", error)
      toast({
        title: "Error",
        description: "Failed to generate bio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGeneratingBio(false)
    }
  }

  const handleSaveBio = async () => {
    try {
      console.log("[v0] Bio save - Current athlete data:", {
        id: athlete.id,
        name: athlete.name,
        bio: athlete.bio,
        bio_headline: athlete.bio_headline,
      })

      console.log("[v0] Bio save - Editable values:", {
        editableBio,
        editableHeadline,
      })

      const updateData = {
        ...athlete, // Include all existing athlete data
        bio: editableBio,
        bio_headline: editableHeadline,
      }

      console.log("[v0] Bio save - Update data being sent:", {
        bio: updateData.bio,
        bio_headline: updateData.bio_headline,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
      })

      const result = await updateAthleteAction(id, updateData)

      console.log("[v0] Bio save - Update result:", result)

      if (!result.success) {
        throw new Error(result.error || "Failed to save bio")
      }

      setAthlete((prev) => ({ ...prev, bio: editableBio, bio_headline: editableHeadline }))

      toast({
        title: "Success",
        description: "Bio and headline saved successfully!",
      })
    } catch (error) {
      console.error("Error saving bio:", error)
      toast({
        title: "Error",
        description: "Failed to save bio. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      setSaveSuccess(false)
      setUpdatedFields([])
      setFieldChanges({})
      setDebugInfo(null)
      setSaveTimestamp(null)

      console.log("[v0] Admin handleSubmit - Received data with new fields:", {
        super_32_2024_record: data.super_32_2024_record,
        super_32_2024_placement: data.super_32_2024_placement,
        super_32_2025_record: data.super_32_2025_record,
        super_32_2025_placement: data.super_32_2025_placement,
        nationally_ranked_wins: data.nationally_ranked_wins,
        college_opens_experience: data.college_opens_experience,
        wrestlingClub: data.wrestlingClub,
      })

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

        if (missingFields.includes("gender")) {
          data.gender = "Male"
        }
      }

      if (data.achievements && typeof data.achievements === "string") {
        data.achievements = data.achievements
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean)
      }

      console.log("[v0] About to call updateAthleteAction with data:", {
        id,
        newFields: {
          super_32_2024_record: data.super_32_2024_record,
          super_32_2024_placement: data.super_32_2024_placement,
          super_32_2025_record: data.super_32_2025_record,
          super_32_2025_placement: data.super_32_2025_placement,
          nationally_ranked_wins: data.nationally_ranked_wins,
          college_opens_experience: data.college_opens_experience,
          wrestlingClub: data.wrestlingClub,
        },
      })

      const result = await updateAthleteAction(id, data)

      console.log("[v0] updateAthleteAction result:", result)

      if (!result.success) {
        throw new Error(result.error || "Failed to update athlete")
      }

      setSaveSuccess(true)
      setSaveTimestamp(new Date().toLocaleString())
      setAthlete(result.data)
      setOriginalAthlete(JSON.parse(JSON.stringify(result.data)))

      toast({
        title: "Success",
        description: `${data.firstName} ${data.lastName} updated successfully`,
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating athlete:", error)
      toast({
        title: "Error updating athlete",
        description:
          error instanceof Error ? error.message : "There was an error updating the athlete. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
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
            <Button onClick={() => router.refresh()} className="bg-[#B31B1B] hover:bg-[#8B1515]">
              Try Again
            </Button>
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
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
    <div className="min-h-screen bg-gray-50">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push("/admin/athletes")}
                className="border-white text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Athletes
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Edit Athlete</h1>
                <p className="text-blue-200 text-lg">{athlete.name}</p>
              </div>
            </div>
             <div className="flex flex-wrap gap-2">
               <Button variant="outline" size="sm" asChild className="bg-white text-[#002147] border-white hover:bg-gray-100">
                 <a href={`/admin/athletes/images/${id}`}>Upload Images</a>
               </Button>
               <Button variant="outline" size="sm" asChild className="bg-white text-[#002147] border-white hover:bg-gray-100">
                 <a href={`/${athlete.college ? "athletes" : "prospects"}/${id}`} target="_blank" rel="noopener noreferrer">
                   View {athlete.college ? "Athlete" : "Prospect"} Profile
                 </a>
               </Button>
               <Button variant="outline" size="sm" asChild className="bg-white text-[#002147] border-white hover:bg-gray-100">
                 <a href={`/unified-profile/${id}`} target="_blank" rel="noopener noreferrer">
                   Unified Profile
                 </a>
               </Button>
             </div>
          </div>
          
          {/* Quick Info Badges */}
          <div className="flex flex-wrap gap-3 mt-6">
            {athlete.highschool && (
              <Badge className="bg-white/20 text-white border-white/30">
                {athlete.highschool}
              </Badge>
            )}
            {athlete.graduationyear && (
              <Badge className="bg-white/20 text-white border-white/30">
                Class of {athlete.graduationyear}
              </Badge>
            )}
            {athlete.weightclass && (
              <Badge className="bg-white/20 text-white border-white/30">
                {athlete.weightclass} lbs
              </Badge>
            )}
            {athlete.recruiting_status && (
              <Badge className={`${
                athlete.recruiting_status?.toLowerCase() === "committed" || 
                athlete.recruiting_status?.toLowerCase() === "college athlete"
                  ? "bg-green-500"
                  : athlete.recruiting_status?.toLowerCase() === "uncommitted"
                  ? "bg-yellow-500"
                  : "bg-white/20"
              } text-white border-0`}>
                {athlete.recruiting_status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Debug Button - Optional */}
        <div className="mb-4">
          <Button variant="outline" size="sm" asChild className="hover:bg-gray-100">
            <a href={`/debug/athlete-form/${id}`} target="_blank" rel="noopener noreferrer">
              View Debug Data
            </a>
          </Button>
        </div>

        {/* AI Bio Generation Card */}
        <Card className="mb-6 shadow-lg border-t-4 border-t-[#B31B1B]">
          <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] text-white">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Bio Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div>
                <p className="text-gray-700 mb-2 font-medium">
                  Generate a compelling bio and headline based on this athlete's achievements and data
                </p>
                <p className="text-sm text-gray-600">
                  AI will analyze tournament results, academics, and achievements to create a professional summary
                </p>
              </div>
              <Button
                onClick={handleGenerateBio}
                disabled={generatingBio}
                className="bg-[#B31B1B] hover:bg-[#8B1515] text-white whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingBio ? "Generating..." : "Generate AI Bio"}
              </Button>
            </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="headline" className="text-sm font-medium text-gray-700">
                Headline (Format: "Name, High School — Achievements")
              </Label>
              <Input
                id="headline"
                value={editableHeadline}
                onChange={(e) => setEditableHeadline(e.target.value)}
                placeholder="Tobin McNair, Wakefield HS — State Champion & NHSCA All-American"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-gray-700">
                Bio (Editable - Note: Regenerating will overwrite manual edits)
              </Label>
              <Textarea
                id="bio"
                value={editableBio}
                onChange={(e) => setEditableBio(e.target.value)}
                placeholder="Enter athlete bio..."
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveBio} 
                className="bg-[#B31B1B] hover:bg-[#8B1515] text-white"
              >
                Save Bio & Headline
              </Button>
            </div>
          </div>

          {(athlete.bio || athlete.bio_headline) && (
            <div className="mt-4 p-4 bg-gradient-to-r from-[#002147]/5 to-[#003366]/5 rounded-lg border border-[#002147]/20">
              <h4 className="font-semibold text-[#002147] mb-2">Current Profile:</h4>
              {athlete.bio_headline && (
                <div className="mb-2">
                  <span className="text-sm text-[#002147] font-medium">Headline:</span>
                  <p className="text-gray-700 font-semibold">{athlete.bio_headline}</p>
                </div>
              )}
              {athlete.bio && (
                <div>
                  <span className="text-sm text-[#002147] font-medium">Bio:</span>
                  <p className="text-gray-700 leading-relaxed">{athlete.bio}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

        {saveSuccess && (
          <Alert className="mb-6 bg-blue-50 border-[#002147] border-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-[#002147]" />
            <AlertTitle className="text-[#002147] font-semibold">Save Successful</AlertTitle>
            <AlertDescription className="text-gray-700">
              {saveTimestamp && <p className="text-sm mb-2 font-medium">Last saved: {saveTimestamp}</p>}
              {updatedFields.length > 0 ? (
                <>
                  <p className="mb-2">The following fields were updated:</p>
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

      {/* Tournament Results Section */}
      <div className="container mx-auto px-4 py-6">
        <TournamentResultsEditor
          athleteId={id}
          nhscaResults={athlete.nhsca_results || []}
          super32Results={athlete.super32_results || []}
          onSave={() => {
            toast({
              title: "Success",
              description: "Tournament results saved successfully!",
            })
          }}
        />
      </div>

      <AthleteForm onSubmit={handleSubmit} initialData={athlete} />

        {saveSuccess && (
          <Card className="mt-6 shadow-lg border-t-4 border-t-[#002147]">
            <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] text-white">
              <CardTitle className="text-lg font-semibold">Validation Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-700 font-medium">All required fields are valid and data was saved successfully.</p>

              {Object.keys(fieldChanges).length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-[#002147] mb-2">Changed Fields:</h3>
                  <div className="bg-white rounded-md p-3 border-2 border-gray-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 px-2 text-[#002147] font-semibold">Field</th>
                        <th className="text-left py-2 px-2 text-[#002147] font-semibold">Before</th>
                        <th className="text-left py-2 px-2 text-[#002147] font-semibold">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fieldChanges).map(([field, values]: [string, any]) => (
                        <tr key={field} className="border-b border-gray-100">
                          <td className="py-2 px-2 font-medium">{field}</td>
                          <td className="py-2 px-2">
                            {typeof values.before === "object" ? JSON.stringify(values.before) : values.before}
                          </td>
                          <td className="py-2 px-2">
                            {typeof values.after === "object" ? JSON.stringify(values.after) : values.after}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

              <div className="mt-4 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="hover:bg-[#002147] hover:text-white"
                >
                  <a href={`/${athlete.college ? "athletes" : "prospects"}/${id}`}>
                    View {athlete.college ? "Athlete" : "Prospect"} Profile
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="hover:bg-[#002147] hover:text-white"
                >
                  <a href={`/unified-profile/${id}`}>Unified Profile</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {debugInfo && (
          <Card className="mt-6 shadow-sm border-t-4 border-t-gray-400">
            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="text-gray-800 text-lg font-semibold">Debug Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))}
                className="hover:bg-gray-300"
              >
                Copy to Clipboard
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded border">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
