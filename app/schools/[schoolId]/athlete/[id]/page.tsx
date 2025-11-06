"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Phone, 
  Mail, 
  MapPin,
  Trophy,
  GraduationCap,
  DollarSign,
  FileText,
  MessageSquare,
  Save,
  Plus,
  Edit2,
  Award
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TournamentResult {
  year: number
  placement: string
  record?: string
  weight?: string
  division?: string
}

interface NCHSAAResult {
  year: number
  place: number
  classification: string
  weight_class: string
}

interface Athlete {
  id: string
  name: string
  graduationyear: number
  gender: string
  weightclass: string
  highschool: string
  wrestlingClub: string
  photourl: string
  prospect_ranking: number
  academic_gpa: number
  academic_sat: number
  academic_act: number
  location: string
  phone: string
  contactEmail: string
  bio: string
  careerRecord: string
  college_opens_experience: string
  highlight_video_url: string
  
  // Performance/Tournament Data
  super_32_2023_record?: string
  super_32_2023_placement?: string
  super_32_2024_record?: string
  super_32_2024_placement?: string
  super_32_2025_record?: string
  super_32_2025_placement?: string
  nhsca_2024_record?: string
  nhsca_2024_placement?: string
  nhsca_2025_record?: string
  nhsca_2025_placement?: string
  nhsca_results?: TournamentResult[]
  super32_results?: TournamentResult[]
  nationally_ranked_wins?: string
  fargo_experience?: string
  
  // Recruiting tracking data
  is_starred: boolean
  starred_at: string
  pipeline_stage: string
  interest_level: string
  
  // NEW: Milestone tracking
  first_contact_date?: string
  first_contact_method?: string
  has_applied?: boolean
  applied_date?: string
  campus_visit_date?: string
  campus_visit_type?: string
  official_visit_date?: string
  financial_package_sent?: boolean
  package_sent_date?: string
  package_amount?: number
  offer_extended?: boolean
  offer_date?: string
  offer_details?: string
  committed_date?: string
  nli_signed_date?: string
  communication_log?: any[]
  recruiting_notes?: string
  
  // Existing financial fields
  financial_efc?: number
  financial_aid_needs?: string
  scholarship_requirements?: string
  ability_to_pay?: string
  financial_notes?: string
  financial_concerns?: string
  merit_scholarship_eligible?: boolean
  need_based_aid_eligible?: boolean
  aid_application_status?: string
}

export default function AthleteRecruitingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = params.id as string
  const schoolId = params.schoolId as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nchsaaResults, setNchsaaResults] = useState<NCHSAAResult[]>([])
  
  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
  
  // Form states for milestones
  const [milestones, setMilestones] = useState({
    first_contact_date: "",
    first_contact_method: "",
    has_applied: false,
    applied_date: "",
    campus_visit_date: "",
    campus_visit_type: "unofficial",
    official_visit_date: "",
    financial_package_sent: false,
    package_sent_date: "",
    package_amount: "",
    offer_extended: false,
    offer_date: "",
    offer_details: "",
    committed_date: "",
    nli_signed_date: "",
    recruiting_notes: "",
  })

  // Communication log
  const [newCommunication, setNewCommunication] = useState({
    type: "email",
    date: "",
    notes: "",
  })

  useEffect(() => {
    fetchAthleteDetails()
  }, [athleteId])

  useEffect(() => {
    // Fetch NCHSAA results for NC athletes
    if (athlete && athlete.location === "NC") {
      fetchNCHSAAResults()
    }
  }, [athlete])

  const fetchNCHSAAResults = async () => {
    if (!athlete) return
    
    try {
      const response = await fetch(`/api/nchsaa-results?athleteName=${encodeURIComponent(athlete.name)}&graduationYear=${athlete.graduationyear}`)
      if (response.ok) {
        const data = await response.json()
        setNchsaaResults(data.results || [])
      }
    } catch (error) {
      console.error("Error fetching NCHSAA results:", error)
    }
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!athlete) return

    const previousValue = athlete[field as keyof Athlete]
    
    // Optimistic update
    setAthlete((prev) => {
      if (!prev) return null
      return { ...prev, [field]: value || null } as Athlete
    })

    try {
      const searchParams = new URLSearchParams(window.location.search)
      const viewAsCoachId = searchParams.get("viewAsCoachId")
      
      const response = await fetch("/api/coaches/update-athlete-field", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: athlete.id,
          field,
          value: value || null,
          viewAsCoachId,
        }),
      })

      if (!response.ok) {
        // Revert on error
        setAthlete((prev) => {
          if (!prev) return null
          return { ...prev, [field]: previousValue } as Athlete
        })
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update field")
        return
      }

      toast.success("Field updated successfully")
    } catch (error) {
      // Revert on error
      setAthlete((prev) => {
        if (!prev) return null
        return { ...prev, [field]: previousValue } as Athlete
      })
      toast.error("Network error. Please try again.")
    } finally {
      setEditingField(null)
      setEditingValue("")
    }
  }

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field)
    setEditingValue(currentValue?.toString() || "")
  }

  const fetchAthleteDetails = async () => {
    try {
      setLoading(true)
      
      // Get viewAsCoachId from URL if present (for admin viewing)
      const searchParams = new URLSearchParams(window.location.search)
      const viewAsCoachId = searchParams.get("viewAsCoachId")
      const apiUrl = `/api/coaches/athlete-details/${athleteId}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
      
      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const data = await response.json()
        setAthlete(data.athlete)
        
        // Populate form with existing milestone data
        setMilestones({
          first_contact_date: data.athlete.first_contact_date?.split('T')[0] || "",
          first_contact_method: data.athlete.first_contact_method || "",
          has_applied: data.athlete.has_applied || false,
          applied_date: data.athlete.applied_date?.split('T')[0] || "",
          campus_visit_date: data.athlete.campus_visit_date?.split('T')[0] || "",
          campus_visit_type: data.athlete.campus_visit_type || "unofficial",
          official_visit_date: data.athlete.official_visit_date?.split('T')[0] || "",
          financial_package_sent: data.athlete.financial_package_sent || false,
          package_sent_date: data.athlete.package_sent_date?.split('T')[0] || "",
          package_amount: data.athlete.package_amount?.toString() || "",
          offer_extended: data.athlete.offer_extended || false,
          offer_date: data.athlete.offer_date?.split('T')[0] || "",
          offer_details: data.athlete.offer_details || "",
          committed_date: data.athlete.committed_date?.split('T')[0] || "",
          nli_signed_date: data.athlete.nli_signed_date?.split('T')[0] || "",
          recruiting_notes: data.athlete.recruiting_notes || "",
        })
      }
    } catch (error) {
      console.error("Error fetching athlete details:", error)
      toast.error("Failed to load athlete details")
    } finally {
      setLoading(false)
    }
  }

  const saveMilestones = async () => {
    try {
      setSaving(true)
      
      const searchParams = new URLSearchParams(window.location.search)
      const viewAsCoachId = searchParams.get("viewAsCoachId")
      const apiUrl = `/api/coaches/athlete-details/${athleteId}/milestones${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
      
      // Combine milestones and financial data
      const dataToSave = {
        ...milestones,
        financial_efc: athlete.financial_efc,
        financial_aid_needs: athlete.financial_aid_needs,
        scholarship_requirements: athlete.scholarship_requirements,
        ability_to_pay: athlete.ability_to_pay,
        financial_notes: athlete.financial_notes,
        financial_concerns: athlete.financial_concerns,
        merit_scholarship_eligible: athlete.merit_scholarship_eligible,
        need_based_aid_eligible: athlete.need_based_aid_eligible,
        aid_application_status: athlete.aid_application_status,
      }
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      })

      if (response.ok) {
        toast.success("Milestones updated successfully")
        fetchAthleteDetails() // Refresh
      } else {
        toast.error("Failed to update milestones")
      }
    } catch (error) {
      console.error("Error saving milestones:", error)
      toast.error("Failed to update milestones")
    } finally {
      setSaving(false)
    }
  }

  const addCommunication = async () => {
    if (!newCommunication.date || !newCommunication.notes) {
      toast.error("Please fill in date and notes")
      return
    }

    try {
      const searchParams = new URLSearchParams(window.location.search)
      const viewAsCoachId = searchParams.get("viewAsCoachId")
      const apiUrl = `/api/coaches/athlete-details/${athleteId}/communication${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCommunication),
      })

      if (response.ok) {
        toast.success("Communication logged")
        setNewCommunication({ type: "email", date: "", notes: "" })
        fetchAthleteDetails() // Refresh
      } else {
        toast.error("Failed to log communication")
      }
    } catch (error) {
      console.error("Error adding communication:", error)
      toast.error("Failed to log communication")
    }
  }

  const getTimelineSteps = () => {
    return [
      { 
        label: "Starred", 
        date: athlete?.starred_at,
        completed: true,
        icon: "⭐"
      },
      { 
        label: "First Contact", 
        date: athlete?.first_contact_date,
        completed: !!athlete?.first_contact_date,
        icon: "💬"
      },
      { 
        label: "Campus Visit", 
        date: athlete?.campus_visit_date,
        completed: !!athlete?.campus_visit_date,
        icon: "🏫"
      },
      { 
        label: "Offer Extended", 
        date: athlete?.offer_date,
        completed: athlete?.offer_extended || false,
        icon: "💰"
      },
      { 
        label: "Committed", 
        date: athlete?.committed_date,
        completed: !!athlete?.committed_date,
        icon: "✅"
      },
      { 
        label: "Applied", 
        date: athlete?.applied_date,
        completed: athlete?.has_applied || false,
        icon: "📝"
      },
      { 
        label: "Signed NLI", 
        date: athlete?.nli_signed_date,
        completed: !!athlete?.nli_signed_date,
        icon: "🖊️"
      },
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading athlete details...</p>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Athlete not found</p>
      </div>
    )
  }

  const timelineSteps = getTimelineSteps()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/schools/${schoolId}/portal`)}
            className="mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>

          <div className="flex items-start gap-6">
            {/* Athlete Photo */}
            {athlete.photourl && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 border-gray-200">
                <Image
                  src={athlete.photourl}
                  alt={athlete.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Athlete Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#002147] mb-2">{athlete.name}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="bg-white">
                  Class of {athlete.graduationyear}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {athlete.weightclass} lbs
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {athlete.highschool}
                </Badge>
                {athlete.prospect_ranking && (
                  <Badge className="bg-[#BC0B03] text-white">
                    #{athlete.prospect_ranking} NC Prospect
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 text-sm text-gray-600">
                <span>⭐ Starred: {new Date(athlete.starred_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="capitalize">{athlete.pipeline_stage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Recruiting Timeline */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#002147] to-[#13294B] text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recruiting Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
                <div 
                  className="h-full bg-[#BC0B03] transition-all duration-500"
                  style={{ 
                    width: `${(timelineSteps.filter(s => s.completed).length / timelineSteps.length) * 100}%` 
                  }}
                />
              </div>

              {/* Timeline steps */}
              <div className="relative flex justify-between overflow-x-auto pb-2">
                {timelineSteps.map((step, index) => (
                  <div key={index} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '80px' }}>
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-base md:text-lg mb-2 border-2
                      ${step.completed 
                        ? 'bg-[#BC0B03] border-[#BC0B03] text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}>
                      {step.icon}
                    </div>
                    
                    {/* Label */}
                    <p className={`text-[10px] md:text-xs font-medium text-center mb-1 px-1 ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    
                    {/* Date */}
                    {step.date && (
                      <p className="text-[9px] md:text-xs text-gray-500">
                        {new Date(step.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="profile" className="text-xs md:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs md:text-sm">Performance</TabsTrigger>
            <TabsTrigger value="recruiting" className="text-xs md:text-sm">Recruiting</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs md:text-sm">Financial</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs md:text-sm">Notes</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academic Stats - Inline Editable */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-[#002147]" />
                    Academics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GPA */}
                  <div className="group relative">
                    <Label className="text-sm text-gray-600">GPA</Label>
                    {editingField === "academic_gpa" ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleFieldUpdate("academic_gpa", editingValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleFieldUpdate("academic_gpa", editingValue)
                          } else if (e.key === "Escape") {
                            setEditingField(null)
                            setEditingValue("")
                          }
                        }}
                        className="text-2xl font-bold h-12"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                        onClick={() => startEditing("academic_gpa", athlete.academic_gpa)}
                      >
                        {athlete.academic_gpa ? (
                          <p className="text-2xl font-bold text-[#002147]">{athlete.academic_gpa.toFixed(2)}</p>
                        ) : (
                          <p className="text-2xl font-bold text-gray-400">-</p>
                        )}
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* SAT */}
                    <div className="group relative">
                      <Label className="text-sm text-gray-600">SAT</Label>
                      {editingField === "academic_sat" ? (
                        <Input
                          type="number"
                          min="0"
                          max="1600"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleFieldUpdate("academic_sat", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFieldUpdate("academic_sat", editingValue)
                            } else if (e.key === "Escape") {
                              setEditingField(null)
                              setEditingValue("")
                            }
                          }}
                          className="text-xl font-semibold h-10"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                          onClick={() => startEditing("academic_sat", athlete.academic_sat)}
                        >
                          {athlete.academic_sat ? (
                            <p className="text-xl font-semibold text-gray-900">{athlete.academic_sat}</p>
                          ) : (
                            <p className="text-xl font-semibold text-gray-400">-</p>
                          )}
                          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1" />
                        </div>
                      )}
                    </div>

                    {/* ACT */}
                    <div className="group relative">
                      <Label className="text-sm text-gray-600">ACT</Label>
                      {editingField === "academic_act" ? (
                        <Input
                          type="number"
                          min="0"
                          max="36"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleFieldUpdate("academic_act", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFieldUpdate("academic_act", editingValue)
                            } else if (e.key === "Escape") {
                              setEditingField(null)
                              setEditingValue("")
                            }
                          }}
                          className="text-xl font-semibold h-10"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                          onClick={() => startEditing("academic_act", athlete.academic_act)}
                        >
                          {athlete.academic_act ? (
                            <p className="text-xl font-semibold text-gray-900">{athlete.academic_act}</p>
                          ) : (
                            <p className="text-xl font-semibold text-gray-400">-</p>
                          )}
                          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info - Inline Editable */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5 text-[#002147]" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center gap-2 text-sm group">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {editingField === "contactEmail" ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="email"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleFieldUpdate("contactEmail", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFieldUpdate("contactEmail", editingValue)
                            } else if (e.key === "Escape") {
                              setEditingField(null)
                              setEditingValue("")
                            }
                          }}
                          className="flex-1 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                        onClick={() => startEditing("contactEmail", athlete.contactEmail)}
                      >
                        {athlete.contactEmail ? (
                          <a
                            href={`mailto:${athlete.contactEmail}`}
                            className="text-blue-600 hover:underline flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {athlete.contactEmail}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Click to add email</span>
                        )}
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 text-sm group">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {editingField === "phone" ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="tel"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleFieldUpdate("phone", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFieldUpdate("phone", editingValue)
                            } else if (e.key === "Escape") {
                              setEditingField(null)
                              setEditingValue("")
                            }
                          }}
                          className="flex-1 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                        onClick={() => startEditing("phone", athlete.phone)}
                      >
                        {athlete.phone ? (
                          <a
                            href={`tel:${athlete.phone}`}
                            className="text-blue-600 hover:underline flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {athlete.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Click to add phone</span>
                        )}
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm group">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {editingField === "location" ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleFieldUpdate("location", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFieldUpdate("location", editingValue)
                            } else if (e.key === "Escape") {
                              setEditingField(null)
                              setEditingValue("")
                            }
                          }}
                          className="flex-1 h-8 text-sm"
                          placeholder="State (e.g., NC, VA)"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1"
                        onClick={() => startEditing("location", athlete.location)}
                      >
                        {athlete.location ? (
                          <span className="text-gray-700 flex-1">{athlete.location}</span>
                        ) : (
                          <span className="text-gray-400 italic">Click to add location</span>
                        )}
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Wrestling Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-[#002147]" />
                    Wrestling Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">High School</Label>
                    <p className="font-medium text-gray-900">{athlete.highschool}</p>
                  </div>
                  {athlete.wrestlingClub && (
                    <div>
                      <Label className="text-sm text-gray-600">Club Team</Label>
                      <p className="font-medium text-gray-900">{athlete.wrestlingClub}</p>
                    </div>
                  )}
                  {athlete.careerRecord && (
                    <div>
                      <Label className="text-sm text-gray-600">Career Record</Label>
                      <p className="font-medium text-gray-900">{athlete.careerRecord}</p>
                    </div>
                  )}
                  {athlete.highlight_video_url && (
                    <div>
                      <Label className="text-sm text-gray-600">Highlight Video</Label>
                      <a 
                        href={athlete.highlight_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Highlights →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-[#002147]" />
                    Bio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{athlete.bio || "No bio available"}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PERFORMANCE TAB */}
          <TabsContent value="performance" className="space-y-6">
            {/* Career Record */}
            {athlete.careerRecord && (
              <Card className="bg-gradient-to-r from-[#002147] to-[#13294B] text-white">
                <CardContent className="p-6">
                  <div className="text-sm font-semibold mb-2">Career Record</div>
                  <div className="text-4xl font-bold">{athlete.careerRecord}</div>
                </CardContent>
              </Card>
            )}

            {/* Tournament Results Display (same as unified profile) */}
            <TournamentResultsDisplay
              nchsaaResults={nchsaaResults}
              nhscaResults={athlete.nhsca_results || []}
              super32Results={athlete.super32_results || []}
            />

            {/* Additional Sections for Non-NC Athletes or All Athletes */}
            <div className="space-y-6">
              {/* College Opens */}
              {athlete.college_opens_experience && (
                <Card className="border-t-4 border-t-green-600 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 py-4">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5" />
                      College Opens
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-gray-700">{athlete.college_opens_experience}</p>
                  </CardContent>
                </Card>
              )}

              {/* Fargo */}
              {athlete.fargo_experience && (
                <Card className="border-t-4 border-t-purple-600 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 py-4">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5" />
                      Fargo Nationals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-gray-700">{athlete.fargo_experience}</p>
                  </CardContent>
                </Card>
              )}

              {/* Nationally Ranked Wins */}
              {athlete.nationally_ranked_wins && (
                <Card className="border-t-4 border-t-orange-600 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 py-4">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5" />
                      Nationally Ranked Wins
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-gray-700">{athlete.nationally_ranked_wins}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Empty State */}
            {!athlete.careerRecord && 
             nchsaaResults.length === 0 &&
             (!athlete.nhsca_results || athlete.nhsca_results.length === 0) &&
             (!athlete.super32_results || athlete.super32_results.length === 0) &&
             !athlete.college_opens_experience &&
             !athlete.fargo_experience &&
             !athlete.nationally_ranked_wins && (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="italic">No performance data available</p>
              </div>
            )}
          </TabsContent>

          {/* RECRUITING STATUS TAB */}
          <TabsContent value="recruiting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#002147]" />
                    Recruiting Milestones
                  </span>
                  <Button 
                    onClick={saveMilestones} 
                    disabled={saving}
                    className="bg-[#BC0B03] hover:bg-[#9a0902]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* First Contact */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    📧 First Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={milestones.first_contact_date}
                        onChange={(e) => setMilestones({ ...milestones, first_contact_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Method</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={milestones.first_contact_method}
                        onChange={(e) => setMilestones({ ...milestones, first_contact_method: e.target.value })}
                      >
                        <option value="">Select method</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone Call</option>
                        <option value="text">Text Message</option>
                        <option value="in-person">In-Person</option>
                        <option value="camp">At Camp/Tournament</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Application */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    📝 Application Status
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="has_applied"
                        checked={milestones.has_applied}
                        onCheckedChange={(checked) => setMilestones({ ...milestones, has_applied: checked as boolean })}
                      />
                      <Label htmlFor="has_applied" className="font-medium cursor-pointer">
                        Athlete has applied to our institution
                      </Label>
                    </div>
                    {milestones.has_applied && (
                      <div className="ml-7">
                        <Label>Application Date</Label>
                        <Input
                          type="date"
                          value={milestones.applied_date}
                          onChange={(e) => setMilestones({ ...milestones, applied_date: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Campus Visits */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🏫 Campus Visits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Unofficial Visit Date</Label>
                      <Input
                        type="date"
                        value={milestones.campus_visit_date}
                        onChange={(e) => setMilestones({ ...milestones, campus_visit_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Official Visit Date</Label>
                      <Input
                        type="date"
                        value={milestones.official_visit_date}
                        onChange={(e) => setMilestones({ ...milestones, official_visit_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Offer */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🎯 Offer Status
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="offer_extended"
                        checked={milestones.offer_extended}
                        onCheckedChange={(checked) => setMilestones({ ...milestones, offer_extended: checked as boolean })}
                      />
                      <Label htmlFor="offer_extended" className="font-medium cursor-pointer">
                        Roster spot offered
                      </Label>
                    </div>
                    {milestones.offer_extended && (
                      <div className="ml-7 space-y-4">
                        <div>
                          <Label>Offer Date</Label>
                          <Input
                            type="date"
                            value={milestones.offer_date}
                            onChange={(e) => setMilestones({ ...milestones, offer_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Offer Details (Scholarship, Package Amount, etc.)</Label>
                          <Textarea
                            placeholder="Example: $25,000 total package - $15,000 athletic scholarship + $10,000 academic merit"
                            value={milestones.offer_details}
                            onChange={(e) => setMilestones({ ...milestones, offer_details: e.target.value })}
                            rows={4}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Commitment */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    ✅ Commitment
                  </h3>
                  <div>
                    <Label>Commitment Date</Label>
                    <Input
                      type="date"
                      value={milestones.committed_date}
                      onChange={(e) => setMilestones({ ...milestones, committed_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* NLI Signing */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    ✍️ National Letter of Intent
                  </h3>
                  <div>
                    <Label>NLI Signing Date</Label>
                    <Input
                      type="date"
                      value={milestones.nli_signed_date}
                      onChange={(e) => setMilestones({ ...milestones, nli_signed_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCIAL AID TAB */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Aid Profile
                  </span>
                  <Button 
                    onClick={saveMilestones} 
                    disabled={saving}
                    size="sm"
                    className="bg-white text-green-700 hover:bg-gray-100"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Financial Data
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* EFC */}
                  <div>
                    <Label htmlFor="efc" className="text-sm font-semibold mb-2 block">
                      Expected Family Contribution (EFC)
                    </Label>
                    <Input
                      id="efc"
                      type="number"
                      placeholder="Enter EFC amount"
                      value={athlete.financial_efc || ""}
                      onChange={(e) => setAthlete({ ...athlete, financial_efc: parseFloat(e.target.value) || 0 })}
                      className="mb-2"
                    />
                    <p className="text-xs text-gray-500">
                      Amount family is expected to contribute toward college costs
                    </p>
                  </div>

                  {/* Ability to Pay */}
                  <div>
                    <Label htmlFor="ability_to_pay" className="text-sm font-semibold mb-2 block">
                      Ability to Pay
                    </Label>
                    <select
                      id="ability_to_pay"
                      className="w-full px-3 py-2 border rounded-md"
                      value={athlete.ability_to_pay || ""}
                      onChange={(e) => setAthlete({ ...athlete, ability_to_pay: e.target.value })}
                    >
                      <option value="">Select ability to pay</option>
                      <option value="full">Full Pay</option>
                      <option value="partial">Partial Need</option>
                      <option value="significant">Significant Need</option>
                      <option value="full_need">Full Need</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>

                  {/* Aid Application Status */}
                  <div>
                    <Label htmlFor="aid_status" className="text-sm font-semibold mb-2 block">
                      Aid Application Status
                    </Label>
                    <select
                      id="aid_status"
                      className="w-full px-3 py-2 border rounded-md"
                      value={athlete.aid_application_status || ""}
                      onChange={(e) => setAthlete({ ...athlete, aid_application_status: e.target.value })}
                    >
                      <option value="">Select status</option>
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="fafsa_submitted">FAFSA Submitted</option>
                      <option value="completed">Completed</option>
                      <option value="not_applying">Not Applying</option>
                    </select>
                  </div>

                  {/* Eligibility Checkboxes */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Scholarship Eligibility</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="merit_eligible"
                          checked={athlete.merit_scholarship_eligible || false}
                          onCheckedChange={(checked) => setAthlete({ ...athlete, merit_scholarship_eligible: checked as boolean })}
                        />
                        <Label htmlFor="merit_eligible" className="text-sm font-normal cursor-pointer">
                          Merit Scholarship Eligible
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="need_based_eligible"
                          checked={athlete.need_based_aid_eligible || false}
                          onCheckedChange={(checked) => setAthlete({ ...athlete, need_based_aid_eligible: checked as boolean })}
                        />
                        <Label htmlFor="need_based_eligible" className="text-sm font-normal cursor-pointer">
                          Need-Based Aid Eligible
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Aid Needs */}
                <div>
                  <Label htmlFor="aid_needs" className="text-sm font-semibold mb-2 block">
                    Financial Aid Needs
                  </Label>
                  <Textarea
                    id="aid_needs"
                    placeholder="Describe the athlete's/family's financial aid needs..."
                    value={athlete.financial_aid_needs || ""}
                    onChange={(e) => setAthlete({ ...athlete, financial_aid_needs: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Scholarship Requirements */}
                <div>
                  <Label htmlFor="scholarship_req" className="text-sm font-semibold mb-2 block">
                    Scholarship Requirements
                  </Label>
                  <Textarea
                    id="scholarship_req"
                    placeholder="Required scholarship amounts or specific needs..."
                    value={athlete.scholarship_requirements || ""}
                    onChange={(e) => setAthlete({ ...athlete, scholarship_requirements: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Financial Concerns */}
                <div>
                  <Label htmlFor="financial_concerns" className="text-sm font-semibold mb-2 block">
                    Financial Concerns
                  </Label>
                  <Textarea
                    id="financial_concerns"
                    placeholder="Any financial concerns or constraints..."
                    value={athlete.financial_concerns || ""}
                    onChange={(e) => setAthlete({ ...athlete, financial_concerns: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Financial Notes */}
                <div>
                  <Label htmlFor="financial_notes" className="text-sm font-semibold mb-2 block">
                    Additional Financial Notes
                  </Label>
                  <Textarea
                    id="financial_notes"
                    placeholder="General financial notes or conversation details..."
                    value={athlete.financial_notes || ""}
                    onChange={(e) => setAthlete({ ...athlete, financial_notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES & ACTIVITY TAB */}
          <TabsContent value="activity" className="space-y-6">
            {/* Recruiting Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#002147]" />
                    Recruiting Notes
                  </span>
                  <Button 
                    onClick={saveMilestones} 
                    disabled={saving}
                    size="sm"
                    className="bg-[#BC0B03] hover:bg-[#9a0902]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about this recruit... strengths, concerns, recruiting strategy, etc."
                  value={milestones.recruiting_notes}
                  onChange={(e) => setMilestones({ ...milestones, recruiting_notes: e.target.value })}
                  rows={8}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Communication Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#002147]" />
                  Communication Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new communication */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-blue-900">Log New Communication</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Type</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={newCommunication.type}
                        onChange={(e) => setNewCommunication({ ...newCommunication, type: e.target.value })}
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone Call</option>
                        <option value="text">Text Message</option>
                        <option value="in-person">In-Person Meeting</option>
                        <option value="video">Video Call</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Date</Label>
                      <Input
                        type="date"
                        value={newCommunication.date}
                        onChange={(e) => setNewCommunication({ ...newCommunication, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      placeholder="What was discussed?"
                      value={newCommunication.notes}
                      onChange={(e) => setNewCommunication({ ...newCommunication, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={addCommunication}
                    size="sm"
                    className="bg-[#002147] hover:bg-[#13294B]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>

                {/* Communication history */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Communication History</h4>
                  {athlete.communication_log && athlete.communication_log.length > 0 ? (
                    <div className="space-y-2">
                      {athlete.communication_log.map((comm: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {comm.type}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(comm.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comm.notes}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No communication logged yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

