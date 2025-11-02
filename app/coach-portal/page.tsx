"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { RoleGuard } from "@/components/role-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Search, GraduationCap, Plus, Phone, Mail, MapPin, Award } from "lucide-react"
import { RecruitingFunnelChart } from "@/components/recruiting-funnel-chart"
import { SchoolBrandedHeader } from "@/components/school-branded-header"
import { StatsSummaryBar } from "@/components/stats-summary-bar"
import { useSchoolBranding } from "@/hooks/use-school-branding"
import { ImpersonationBanner } from "@/components/impersonation-banner"

interface Prospect {
  id: string
  name: string
  graduationyear: number
  weightclass: string
  highschool: string
  wrestlingClub: string
  photourl?: string
  achievements: string[]
  gender?: string
  prospect_ranking?: number
  recruiting_status?: string
  academic_gpa?: number
  academic_sat?: number
  academic_act?: number
  academic_summary?: string
  location?: string
  phone?: string
  contactEmail?: string
  bio?: string
  pipeline_stage?: string
  is_starred?: boolean
  star_count?: number
}

interface Note {
  id: string
  note: string
  created_at: string
  note_type?: string
}

interface Activity {
  id: string
  activity_type: string
  description: string
  created_at: string
}

const PIPELINE_STAGES = [
  { id: "prospect", label: "Prospect", color: "bg-gray-500" },
  { id: "contacted", label: "Contacted", color: "bg-blue-500" },
  { id: "evaluating", label: "Evaluating", color: "bg-purple-500" },
  { id: "campus_visit", label: "Campus Visit", color: "bg-orange-500" },
  { id: "offer_extended", label: "Offer Extended", color: "bg-green-500" },
  { id: "committed", label: "Committed", color: "bg-emerald-600" },
]

export default function CoachPortalPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const { branding, isLoading: brandingLoading } = useSchoolBranding(profile?.school_id)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedAthlete, setSelectedAthlete] = useState<Prospect | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.school_id) {
      console.log("[v0] Redirecting to branded portal for school:", profile.school_id)
      router.push(`/schools/${profile.school_id}/portal`)
    }
  }, [profile, router])

  if (profile?.school_id) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your recruiting portal...</p>
        </div>
      </div>
    )
  }

  const fetchProspects = async () => {
    try {
      const response = await fetch("/api/coach-portal/prospects")
      if (response.ok) {
        const data = await response.json()
        setProspects(data.prospects || [])
      }
    } catch (error) {
      console.error("Error fetching prospects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNotes = async (athleteId: string) => {
    console.log("[v0] Fetching notes for athlete:", athleteId)
    try {
      const response = await fetch(`/api/coach-portal/notes?athleteId=${athleteId}`)
      console.log("[v0] Notes API response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Notes fetched successfully:", data.notes?.length || 0, "notes")
        setNotes(data.notes || [])
      } else {
        console.error("[v0] Notes API failed with status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching notes:", error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedAthlete) return

    try {
      const response = await fetch("/api/coach-portal/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          note: newNote,
          noteType: "general",
        }),
      })

      if (response.ok) {
        setNewNote("")
        fetchNotes(selectedAthlete.id)
      }
    } catch (error) {
      console.error("Error adding note:", error)
    }
  }

  const handleStageChange = async (prospectId: string, newStage: string) => {
    try {
      const response = await fetch("/api/coach-portal/update-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: prospectId, stage: newStage }),
      })

      if (response.ok) {
        fetchProspects()
      }
    } catch (error) {
      console.error("Error updating stage:", error)
    }
  }

  const handleDragStart = (prospect: Prospect) => {
    setDraggedProspect(prospect)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (stageId: string) => {
    if (draggedProspect) {
      handleStageChange(draggedProspect.id, stageId)
      setDraggedProspect(null)
    }
  }

  const openAthleteModal = (prospect: Prospect) => {
    console.log("[v0] Opening athlete modal for:", prospect.name, prospect.id)
    setSelectedAthlete(prospect)
    fetchNotes(prospect.id)
  }

  const filteredProspects = prospects.filter((prospect) => {
    const matchesSearch =
      !searchTerm ||
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.highschool?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesYear = selectedYear === "all" || prospect.graduationyear?.toString() === selectedYear

    const matchesGender =
      selectedGender === "all" ||
      (selectedGender === "male" && prospect.gender?.toLowerCase() === "male") ||
      (selectedGender === "female" && prospect.gender?.toLowerCase() === "female")

    let matchesFilter = true
    if (activeFilter === "needsFollowup") {
      // TODO: Implement last contact date logic when available
      matchesFilter = true
    } else if (activeFilter === "offered") {
      matchesFilter = prospect.pipeline_stage === "offer_extended"
    } else if (activeFilter === "committed") {
      matchesFilter = prospect.pipeline_stage === "committed"
    }

    return matchesSearch && matchesYear && matchesGender && matchesFilter
  })

  const graduationYears = [...new Set(prospects.map((p) => p.graduationyear).filter(Boolean))].sort((a, b) => a - b)

  const getProspectsByStage = (stageId: string) => {
    return filteredProspects.filter((p) => (p.pipeline_stage || "prospect") === stageId)
  }

  const stageCounts = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.label] = getProspectsByStage(stage.id).length
      return acc
    },
    {} as Record<string, number>,
  )

  const pipelineStats = {
    totalAthletes: prospects.length,
    needsFollowup: 0, // TODO: Calculate based on last contact date when available
    activeThisWeek: 0, // TODO: Calculate based on recent activity when available
    offersOut: prospects.filter((p) => p.pipeline_stage === "offer_extended").length,
    committed: prospects.filter((p) => p.pipeline_stage === "committed").length,
    byClass: graduationYears.reduce(
      (acc, year) => {
        acc[year] = prospects.filter((p) => p.graduationyear === year).length
        return acc
      },
      {} as Record<number, number>,
    ),
  }

  const handleFilterClick = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter)
  }

  return (
    <RoleGuard allowedRoles={["coach"]} requireVerifiedCoach={true}>
      <ImpersonationBanner />
      <div
        style={{
          backgroundColor: branding?.primary_color ? `${branding.primary_color}15` : "#030712",
        }}
      >
        <SchoolBrandedHeader
          schoolId={profile?.school_id}
          schoolName={profile?.institution}
          subtitle={`${filteredProspects.length} Active Prospects`}
        />

        <div className="container mx-auto px-4 py-6">
          <RecruitingFunnelChart stageCounts={stageCounts} schoolBranding={branding} />
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50">
          <div className="container mx-auto">
            <StatsSummaryBar schoolBranding={branding} stats={pipelineStats} onFilterClick={handleFilterClick} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-3">
              {activeFilter && (
                <Badge
                  variant="secondary"
                  className="bg-blue-600 text-white cursor-pointer"
                  onClick={() => setActiveFilter(null)}
                >
                  {activeFilter === "needsFollowup" && "Needs Follow-up"}
                  {activeFilter === "offered" && "Offers Out"}
                  {activeFilter === "committed" && "Committed"}
                  <span className="ml-2">✕</span>
                </Badge>
              )}

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search athletes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Class Year" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Years</SelectItem>
                  {graduationYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Men's</SelectItem>
                  <SelectItem value="female">Women's</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageProspects = getProspectsByStage(stage.id)
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-80"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg p-4 h-full border border-gray-800/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                        <h3 className="font-bold text-white">{stage.label}</h3>
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                          {stageProspects.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {stageProspects.map((prospect) => (
                        <Card
                          key={prospect.id}
                          draggable
                          onDragStart={() => handleDragStart(prospect)}
                          onClick={() => openAthleteModal(prospect)}
                          className="bg-gray-800 border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <img
                                src={prospect.photourl || "/placeholder.svg?height=48&width=48&query=wrestler"}
                                alt={prospect.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-white text-sm truncate">{prospect.name}</h4>
                                  {prospect.prospect_ranking && prospect.prospect_ranking <= 25 && (
                                    <Badge className="bg-yellow-500 text-black text-xs">
                                      #{prospect.prospect_ranking}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  {prospect.graduationyear} • {prospect.weightclass}lbs
                                </p>
                                <p className="text-xs text-gray-500 mt-1 truncate">{prospect.highschool}</p>

                                {prospect.academic_gpa && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <GraduationCap className="h-3 w-3 text-blue-400" />
                                    <span className="text-xs text-blue-400">
                                      {prospect.academic_gpa.toFixed(2)} GPA
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {stageProspects.length === 0 && (
                        <div className="text-center py-8 text-gray-600 text-sm">No athletes in this stage</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Athlete Detail Modal */}
        <Dialog
          open={!!selectedAthlete}
          onOpenChange={() => {
            console.log("[v0] Dialog onOpenChange called, closing modal")
            setSelectedAthlete(null)
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
            {selectedAthlete ? (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedAthlete.photourl || "/placeholder.svg?height=80&width=80&query=wrestler"}
                      alt={selectedAthlete.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <DialogTitle className="text-2xl text-white">{selectedAthlete.name}</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        {selectedAthlete.highschool} • {selectedAthlete.wrestlingClub}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="bg-blue-600">Class of {selectedAthlete.graduationyear}</Badge>
                        <Badge className="bg-purple-600">{selectedAthlete.weightclass}lbs</Badge>
                        {selectedAthlete.prospect_ranking && (
                          <Badge className="bg-yellow-500 text-black">Ranked #{selectedAthlete.prospect_ranking}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="mt-6">
                  <TabsList className="bg-gray-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-6">
                    {/* Contact Info */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">Contact Information</h3>
                      {console.log("[v0] Contact info for", selectedAthlete.name, ":", {
                        email: selectedAthlete.contactEmail,
                        phone: selectedAthlete.phone,
                        location: selectedAthlete.location,
                      })}
                      <div className="space-y-2 text-sm">
                        {selectedAthlete.contactEmail && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <a href={`mailto:${selectedAthlete.contactEmail}`} className="hover:text-blue-400">
                              {selectedAthlete.contactEmail}
                            </a>
                          </div>
                        )}
                        {selectedAthlete.phone && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <a href={`tel:${selectedAthlete.phone}`} className="hover:text-blue-400">
                              {selectedAthlete.phone}
                            </a>
                          </div>
                        )}
                        {selectedAthlete.location && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            {selectedAthlete.location}
                          </div>
                        )}
                        {!selectedAthlete.contactEmail && !selectedAthlete.phone && !selectedAthlete.location && (
                          <p className="text-gray-500 italic">No contact information available</p>
                        )}
                      </div>
                    </div>

                    {/* Academic Profile */}
                    {(selectedAthlete.academic_gpa || selectedAthlete.academic_sat || selectedAthlete.academic_act) && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Academic Profile</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {selectedAthlete.academic_gpa && (
                            <div>
                              <div className="text-2xl font-bold text-blue-400">
                                {selectedAthlete.academic_gpa.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">GPA</div>
                            </div>
                          )}
                          {selectedAthlete.academic_sat && (
                            <div>
                              <div className="text-2xl font-bold text-blue-400">{selectedAthlete.academic_sat}</div>
                              <div className="text-xs text-gray-500">SAT</div>
                            </div>
                          )}
                          {selectedAthlete.academic_act && (
                            <div>
                              <div className="text-2xl font-bold text-blue-400">{selectedAthlete.academic_act}</div>
                              <div className="text-xs text-gray-500">ACT</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {selectedAthlete.achievements && selectedAthlete.achievements.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Achievements
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedAthlete.achievements.map((achievement, index) => (
                            <Badge key={index} variant="secondary" className="bg-gray-700 text-gray-200">
                              {achievement}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bio */}
                    {selectedAthlete.bio && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="font-semibold text-white mb-3">Bio</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">{selectedAthlete.bio}</p>
                      </div>
                    )}

                    {/* Pipeline Stage */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">Recruiting Stage</h3>
                      <Select
                        value={selectedAthlete.pipeline_stage || "prospect"}
                        onValueChange={(value) => handleStageChange(selectedAthlete.id, value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {PIPELINE_STAGES.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                {stage.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4 mt-6">
                    {/* Add Note */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">Add Note</h3>
                      <Textarea
                        placeholder="Add recruiting notes, call summaries, or observations..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mb-3"
                        rows={3}
                      />
                      <Button onClick={handleAddNote} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {note.note_type || "General"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleDateString()} at{" "}
                              {new Date(note.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">{note.note}</p>
                        </div>
                      ))}

                      {notes.length === 0 && (
                        <div className="text-center py-8 text-gray-600">No notes yet. Add your first note above.</div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-6">
                    <div className="text-center py-8 text-gray-600">Activity tracking coming soon</div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-8 text-gray-600">No athlete selected</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}
