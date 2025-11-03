"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  GraduationCap,
  Plus,
  Phone,
  Mail,
  MapPin,
  Award,
  Users,
  Bell,
  Target,
  Star,
  ExternalLink,
  Video,
  Edit2,
  Trash2,
  Clock,
  FileText,
  AlertCircle,
  LayoutGrid,
  Table,
  X,
  ChevronDown,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RecruitingFunnelChart } from "@/components/recruiting-funnel-chart"
import { SchoolBrandedHeader } from "@/components/school-branded-header"
import { useSchoolBranding } from "@/hooks/use-school-branding"
import { createClient } from "@/lib/supabase/client"
import { RecruitingActionsDashboard, RecruitingActionsDashboardRef } from "@/components/recruiting-actions-dashboard"

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
  careerRecord?: string
  super_32_2024_record?: string
  super_32_2024_placement?: string
  super_32_2023_record?: string
  super_32_2023_placement?: string
  super_32_2025_record?: string
  super_32_2025_placement?: string
  nhsca_2024_record?: string
  nhsca_2024_placement?: string
  nhsca_2025_record?: string
  nhsca_2025_placement?: string
  college_opens_experience?: string
  highlight_video_url?: string
  financial_efc?: number
  financial_aid_needs?: string
  scholarship_requirements?: string
  ability_to_pay?: string
  financial_notes?: string
  merit_scholarship_eligible?: boolean
  need_based_aid_eligible?: boolean
  aid_application_status?: string
  financial_concerns?: string
}

interface Note {
  id: string
  note: string
  created_at: string
  note_type?: string
}

interface Activity {
  id: string
  action_type: string
  description: string
  action_date: string
  outcome?: string
  follow_up_date?: string // Changed from followUpDate to follow_up_date to match database schema
  athlete_id?: string // Added for filtering activities
  athlete_name?: string // Added for displaying in overdue list
  athlete_photo?: string // Added for displaying in overdue list
}

interface NCHSAAResult {
  year: number
  place: number
  weight_class: string
  classification: string
}

interface Document {
  id: string
  file_name: string
  file_url: string
  file_type: string
  uploaded_at: string
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  phone?: string
  email?: string
}

const PIPELINE_STAGES = [
  { id: "Prospect", label: "Prospect", color: "bg-gray-500" },
  { id: "Evaluating", label: "Evaluating", color: "bg-purple-500" },
  { id: "Recruiting", label: "Recruiting", color: "bg-orange-500" },
  { id: "Offered", label: "Offered", color: "bg-green-500" },
  { id: "Committed", label: "Committed", color: "bg-emerald-600" },
  { id: "Signed", label: "Signed", color: "bg-blue-600" },
  { id: "Lost", label: "Lost", color: "bg-red-500" },
]

interface School {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

// Use the updated function name and parameter names
export default function BrandedSchoolPortalPage({ params }: { params: { schoolId: string } }) {
  const { profile, loading: authLoading } = useAuth() // Changed isLoading to loading
  const router = useRouter()
  const { toast } = useToast()
  const { branding: schoolBranding, isLoading: brandingLoading } = useSchoolBranding(params.schoolId)
  // Removed redundant school state - using schoolBranding from hook instead

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"board" | "table">("board")
  const dashboardRef = useRef<RecruitingActionsDashboardRef>(null)
  const [selectedAthlete, setSelectedAthlete] = useState<Prospect | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [newActivity, setNewActivity] = useState({
    actionType: "email", // Changed default actionType from "phone_call" to "email" since phone_call was removed
    actionDate: new Date().toISOString().split("T")[0],
    description: "",
    outcome: "",
    followUpDate: "",
    isScheduled: false, // Renamed from isPastActivity for clarity
  })
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [newFamilyMember, setNewFamilyMember] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
  })
  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [nchsaaResults, setNchsaaResults] = useState<NCHSAAResult[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState("")
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [editingActivity, setEditingActivity] = useState({
    actionType: "",
    description: "",
    actionDate: "",
    outcome: "",
    followUpDate: "", // Added followUpDate to state
  })
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null)
  
  // State for financial information
  const [financialData, setFinancialData] = useState({
    efc: "",
    aidNeeds: "",
    scholarshipRequirements: "",
    abilityToPay: "",
    financialNotes: "",
    meritScholarshipEligible: false,
    needBasedAidEligible: false,
    aidApplicationStatus: "",
    financialConcerns: "",
  })
  const [isSavingFinancials, setIsSavingFinancials] = useState(false)
  // Use a more descriptive state name if `showActivityDialog` refers to the dialog for adding/editing activities
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [ncRecruits, setNcRecruits] = useState<any[]>([])
  const [loadingNcRecruits, setLoadingNcRecruits] = useState(true)
  const [pipelineHistory, setPipelineHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [editingRosterEntry, setEditingRosterEntry] = useState<any | null>(null)
  const [rosterEditForm, setRosterEditForm] = useState({
    roster_status: "Active",
    roster_notes: "",
  })
  const [isRosterHistoryOpen, setIsRosterHistoryOpen] = useState(false)


  // Removed redundant fetchSchool - using useSchoolBranding hook instead

  useEffect(() => {
    const isAuthorized = profile?.is_admin || profile?.school_id === params.schoolId
    if (!authLoading && profile && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, profile, params.schoolId, router])

  const fetchPipelineHistory = async () => {
    const schoolName = schoolBranding?.name
    
    if (!schoolName || typeof schoolName !== "string" || schoolName.trim().length === 0) {
      console.log("[v0] Skipping pipeline history fetch - school name not available")
      return
    }

    try {
      setLoadingHistory(true)
      console.log("[v0] Fetching pipeline history for school:", schoolName)
      
      const response = await fetch(`/api/coaches/pipeline-history?schoolName=${encodeURIComponent(schoolName)}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Pipeline history response:", data)
        setPipelineHistory(data.history || [])
      } else {
        console.error("[v0] Pipeline history fetch failed:", response.status)
        setPipelineHistory([])
      }
    } catch (error) {
      console.error("[v0] Error fetching pipeline history:", error)
      setPipelineHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchNcRecruits = async () => {
    // Use schoolBranding from hook (already fetched)
    const schoolName = schoolBranding?.name
    
    // Ensure school name exists and is a non-empty string before fetching
    if (!schoolName || typeof schoolName !== "string" || schoolName.trim().length === 0) {
      console.log("[v0] Skipping NC recruits fetch - school name not available:", { schoolBrandingName: schoolBranding?.name })
      return
    }
    
    try {
      setLoadingNcRecruits(true)
      console.log("[v0] Fetching NC recruits for school:", schoolName)
      const response = await fetch(`/api/coaches/nc-recruits?schoolName=${encodeURIComponent(schoolName)}`)
      console.log("[v0] NC Recruits API response status:", response.status, response.statusText)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] NC Recruits API response data:", data)
        console.log("[v0] Number of recruits received:", data.recruits?.length || 0)
        if (data.recruits && data.recruits.length > 0) {
          console.log("[v0] Recruit names:", data.recruits.map((r: any) => r.name))
        }
        setNcRecruits(data.recruits || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] NC Recruits API error:", response.status, errorData)
      }
    } catch (error) {
      console.error("[v0] Error fetching NC recruits:", error)
    } finally {
      setLoadingNcRecruits(false)
    }
  }

  const handleSaveRosterEdit = async () => {
    if (!editingRosterEntry) return

    try {
      console.log("[Roster Edit] Starting save for athlete:", editingRosterEntry.id)
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      console.log("[Roster Edit] Session:", session?.user?.id)
      console.log("[Roster Edit] Form data:", rosterEditForm)

      // First, find ANY college_coach_stars record for this athlete at this school
      const { data: existingStars, error: selectError } = await supabase
        .from("college_coach_stars")
        .select("id, coach_user_id")
        .eq("athlete_id", editingRosterEntry.id)

      console.log("[Roster Edit] Existing stars:", existingStars, "Error:", selectError)

      if (existingStars && existingStars.length > 0) {
        // Update all existing records for this athlete (in case multiple coaches starred)
        console.log("[Roster Edit] Updating existing records")
        const { error, data: updateData } = await supabase
          .from("college_coach_stars")
          .update({
            roster_status: rosterEditForm.roster_status,
            roster_notes: rosterEditForm.roster_notes || null,
          })
          .eq("athlete_id", editingRosterEntry.id)
          .select()

        console.log("[Roster Edit] Update result:", updateData, "Error:", error)
        if (error) throw error
      } else {
        // Create new record if doesn't exist
        console.log("[Roster Edit] No existing records, creating new")
        if (!session?.user.id) {
          throw new Error("No user session found")
        }

        const insertData = {
          athlete_id: editingRosterEntry.id,
          coach_user_id: session.user.id,
          pipeline_stage: "Signed",
          roster_status: rosterEditForm.roster_status,
          roster_notes: rosterEditForm.roster_notes || null,
          starred_at: new Date().toISOString(),
        }
        console.log("[Roster Edit] Inserting:", insertData)

        const { error, data: insertResult } = await supabase
          .from("college_coach_stars")
          .insert(insertData)
          .select()

        console.log("[Roster Edit] Insert result:", insertResult, "Error:", error)
        if (error) throw error
      }

      // Refresh the list
      fetchPipelineHistory()
      setEditingRosterEntry(null)
      toast({
        title: "Roster status updated",
        description: `${editingRosterEntry.name}'s roster status has been updated.`,
      })
    } catch (error: any) {
      console.error("Error updating roster status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update roster status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRosterEntry = async (athleteId: string) => {
    try {
      console.log("[Roster Delete] Starting delete for athlete:", athleteId)
      const supabase = createClient()
      
      // Check if there's a college_coach_stars entry
      const { data: existingStars, error: selectError } = await supabase
        .from("college_coach_stars")
        .select("id")
        .eq("athlete_id", athleteId)

      console.log("[Roster Delete] Existing stars:", existingStars, "Error:", selectError)

      if (existingStars && existingStars.length > 0) {
        // Remove the record(s) from college_coach_stars
        console.log("[Roster Delete] Deleting existing records")
        const { error } = await supabase
          .from("college_coach_stars")
          .delete()
          .eq("athlete_id", athleteId)

        console.log("[Roster Delete] Delete result, Error:", error)
        if (error) throw error
      } else {
        // No entry in college_coach_stars - athlete is showing from athletes table only
        // We'll mark them as "Left Program" so they get filtered out
        console.log("[Roster Delete] No existing records, creating with 'Left Program' status")
        const {
          data: { session },
        } = await supabase.auth.getSession()

        console.log("[Roster Delete] Session:", session?.user?.id)

        if (!session?.user.id) {
          throw new Error("No user session found")
        }

        const insertData = {
          athlete_id: athleteId,
          coach_user_id: session.user.id,
          pipeline_stage: "Signed",
          roster_status: "Left Program",
          roster_notes: "Removed from roster history",
          starred_at: new Date().toISOString(),
        }
        console.log("[Roster Delete] Inserting:", insertData)

        const { error, data: insertResult } = await supabase
          .from("college_coach_stars")
          .insert(insertData)
          .select()

        console.log("[Roster Delete] Insert result:", insertResult, "Error:", error)
        if (error) throw error
      }

      // Refresh the list
      fetchPipelineHistory()
      toast({
        title: "Removed from history",
        description: "Athlete has been removed from roster history.",
      })
    } catch (error: any) {
      console.error("Error removing roster entry:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove athlete",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    console.log("[v0] Branded portal page loaded for schoolId:", params.schoolId)
    console.log("[v0] Auth state:", { authLoading, hasProfile: !!profile, profileId: profile?.id })
    if (profile || !authLoading) {
      // Fetch prospects only if profile is loaded or auth is not loading
      fetchProspects()
      fetchActivities() // Fetch all activities initially to populate overdue list
    }
  }, [params.schoolId, profile, authLoading])

  // Fetch NC recruits when school name is available (from schoolBranding hook)
  useEffect(() => {
    // Wait for branding to finish loading before attempting to fetch
    if (brandingLoading) {
      console.log("[v0] NC Recruits useEffect - branding still loading, waiting...")
      return
    }

      const schoolName = schoolBranding?.name
      console.log("[v0] NC Recruits useEffect - brandingLoading:", brandingLoading, "schoolBranding:", schoolBranding, "schoolBranding?.name:", schoolBranding?.name, "final schoolName:", schoolName)
      if (schoolName && typeof schoolName === "string" && schoolName.trim().length > 0) {
        console.log("[v0] School name available, calling fetchNcRecruits and fetchPipelineHistory")
        fetchNcRecruits()
        fetchPipelineHistory()
      } else {
        console.log("[v0] School name not available yet, skipping fetchNcRecruits and fetchPipelineHistory")
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolBranding?.name, brandingLoading])

  const fetchProspects = async () => {
    try {
      console.log("[v0] Fetching prospects for schoolId:", params.schoolId)
      console.log("[v0] Current auth state before fetch:", {
        authLoading,
        hasProfile: !!profile,
        profileSchoolId: profile?.school_id,
        isAdmin: profile?.is_admin,
      })

      setFetchError(null)

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      // Add authorization header if session exists
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/coach-portal/prospects?schoolId=${params.schoolId}`, {
        credentials: "include",
        headers,
      })
      console.log("[v0] Prospects API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Prospects data received:", {
          count: data.prospects?.length || 0,
          prospects: data.prospects,
        })
        if (data.prospects && data.prospects.length > 0) {
          console.log("[v0] First prospect structure:", data.prospects[0])
          console.log("[v0] First prospect pipeline_stage:", data.prospects[0].pipeline_stage)
          console.log(
            "[v0] All prospect stages:",
            data.prospects.map((p: Prospect) => ({
              name: p.name,
              pipeline_stage: p.pipeline_stage,
            })),
          )
        }
        setProspects(data.prospects || [])
        console.log("[v0] Prospects set to state, count:", data.prospects?.length || 0)
        if (!data.prospects || data.prospects.length === 0) {
          setFetchError("API returned successfully but with 0 prospects")
        }
      } else {
        const errorText = await response.text()
        console.error("[v0] Prospects API error:", { status: response.status, error: errorText })
        setFetchError(`API Error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("[v0] Error fetching prospects:", error)
      setFetchError(`Network Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNotes = async (athleteId: string) => {
    try {
      const response = await fetch(`/api/coach-portal/notes?athleteId=${athleteId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching notes:", error)
    }
  }

  const fetchActivities = async (athleteId?: string) => {
    try {
      // If athleteId is provided, fetch for that specific athlete
      // Otherwise, fetch by schoolId (required by API)
      const url = athleteId 
        ? `/api/coach-portal/activities?athleteId=${athleteId}` 
        : `/api/coach-portal/activities?schoolId=${params.schoolId}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Enrich activities with athlete data if fetching all
        if (athleteId) {
          setActivities(data.activities || [])
        } else {
          // Map to include athlete details for overdue list display
          const enrichedActivities = data.activities.map((activity: any) => ({
            ...activity,
            athlete_name: activity.prospect?.name,
            athlete_photo: activity.prospect?.photourl,
          }))
          setActivities(enrichedActivities || [])
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching activities:", error)
    }
  }

  const fetchNchsaaResults = async (athleteId: string) => {
    try {
      const supabase = createClient()

      // Get athlete name and graduation year first
      const athlete = prospects.find((p) => p.id === athleteId)
      if (!athlete) return

      const { data: results } = await supabase
        .from("wrestling_nchsaa_results")
        .select("*")
        .ilike("wrestler_name", `%${athlete.name}%`)
        .gte("year", athlete.graduationyear - 4)
        .lte("year", athlete.graduationyear)
        .order("year", { ascending: false })

      console.log("[v0] NCHSAA results fetched:", results)
      setNchsaaResults(results || [])
    } catch (error) {
      console.error("[v0] Error fetching NCHSAA results:", error)
    }
  }

  const fetchDocuments = async (athleteId: string) => {
    try {
      const response = await fetch(`/api/coach-portal/documents?athleteId=${athleteId}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching documents:", error)
    }
  }

  const fetchFamilyMembers = async (athleteId: string) => {
    try {
      const response = await fetch(`/api/coach-portal/family?athleteId=${athleteId}`)
      if (response.ok) {
        const data = await response.json()
        setFamilyMembers(data.familyMembers || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching family members:", error)
    }
  }

  // Load financial data when athlete is selected
  useEffect(() => {
    if (selectedAthlete) {
      setFinancialData({
        efc: selectedAthlete.financial_efc?.toString() || "",
        aidNeeds: selectedAthlete.financial_aid_needs || "",
        scholarshipRequirements: selectedAthlete.scholarship_requirements || "",
        abilityToPay: selectedAthlete.ability_to_pay || "",
        financialNotes: selectedAthlete.financial_notes || "",
        meritScholarshipEligible: selectedAthlete.merit_scholarship_eligible || false,
        needBasedAidEligible: selectedAthlete.need_based_aid_eligible || false,
        aidApplicationStatus: selectedAthlete.aid_application_status || "",
        financialConcerns: selectedAthlete.financial_concerns || "",
      })
    }
  }, [selectedAthlete])

  // Handler for saving financial information
  const handleSaveFinancials = async () => {
    if (!selectedAthlete) return

    setIsSavingFinancials(true)
    try {
      const response = await fetch(`/api/coaches/starred-athletes/${selectedAthlete.id}/financials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          efc: financialData.efc ? parseFloat(financialData.efc) : null,
          aidNeeds: financialData.aidNeeds,
          scholarshipRequirements: financialData.scholarshipRequirements,
          abilityToPay: financialData.abilityToPay,
          financialNotes: financialData.financialNotes,
          meritScholarshipEligible: financialData.meritScholarshipEligible,
          needBasedAidEligible: financialData.needBasedAidEligible,
          aidApplicationStatus: financialData.aidApplicationStatus,
          financialConcerns: financialData.financialConcerns,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Financial information saved successfully",
        })
        // Refresh the selected athlete data
        const prospect = prospects.find((p) => p.id === selectedAthlete.id)
        if (prospect) {
          // Fetch updated data from API
          const updatedResponse = await fetch(`/api/coach-portal/prospects?schoolId=${params.schoolId}`)
          if (updatedResponse.ok) {
            const updatedData = await updatedResponse.json()
            const updatedProspect = updatedData.prospects?.find((p: Prospect) => p.id === selectedAthlete.id)
            if (updatedProspect) {
              setSelectedAthlete(updatedProspect)
              // Update in prospects list too
              setProspects(
                prospects.map((p) => (p.id === selectedAthlete.id ? updatedProspect : p))
              )
            }
          }
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to save financial information",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving financial information:", error)
      toast({
        title: "Error",
        description: "Error saving financial information",
        variant: "destructive",
      })
    } finally {
      setIsSavingFinancials(false)
    }
  }

  const getLastContactedDate = (athleteId: string) => {
    // Find all activities for this athlete
    const athleteActivities = activities.filter((a) => a.athlete_id === athleteId)

    if (athleteActivities.length === 0) return null

    // Sort by action_date descending and get the most recent
    const sortedActivities = athleteActivities.sort(
      (a, b) => new Date(b.action_date).getTime() - new Date(a.action_date).getTime(),
    )

    return sortedActivities[0].action_date
  }

  const formatLastContactDate = (dateString: string | null) => {
    if (!dateString) return "No contact"

    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
        fetchActivities(selectedAthlete.id)
      }
    } catch (error) {
      console.error("Error adding note:", error)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editingNoteText.trim() || !selectedAthlete) return

    try {
      const response = await fetch("/api/coach-portal/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          note: editingNoteText,
        }),
      })

      if (response.ok) {
        setEditingNoteId(null)
        setEditingNoteText("")
        fetchNotes(selectedAthlete.id)
        fetchActivities(selectedAthlete.id)
      }
    } catch (error) {
      console.error("Error editing note:", error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedAthlete || !confirm("Are you sure you want to delete this note?")) return

    try {
      const response = await fetch(`/api/coach-portal/notes?noteId=${noteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchNotes(selectedAthlete.id)
        fetchActivities(selectedAthlete.id)
      }
    } catch (error) {
      console.error("Error deleting note:", error)
    }
  }

  const handleAddActivity = async () => {
    // Validation for required fields
    if (!selectedAthlete || !newActivity.actionType || !newActivity.actionDate || !newActivity.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Adding activity:", newActivity)
    console.log("[v0] Selected athlete:", selectedAthlete.id)
    console.log("[v0] Is scheduled activity:", newActivity.isScheduled) // Changed from isPastActivity for consistency with state

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          actionType: newActivity.actionType,
          actionDate: newActivity.actionDate,
          description: newActivity.description,
          outcome: newActivity.outcome || null, // Ensure outcome is null if empty
          // Added followUpDate: if isScheduled is true, use the actionDate, otherwise null
          followUpDate: newActivity.isScheduled ? newActivity.actionDate : null,
        }),
      })

      console.log("[v0] Activity save response status:", response.status)
      const data = await response.json()
      console.log("[v0] Activity save response data:", data)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Activity logged successfully",
        })
        setShowActivityDialog(false) // Close the dialog
        setNewActivity({
          actionType: "email", // Reset to default
          actionDate: new Date().toISOString().split("T")[0],
          description: "",
          outcome: "",
          followUpDate: "", // Reset followUpDate
          isScheduled: false, // Reset to false
        })
        console.log("[v0] Refreshing activities list")
        // Fetch activities for the currently selected athlete if one exists
        if (selectedAthlete) {
          await fetchActivities(selectedAthlete.id)
        }
        await fetchActivities() // Refetch all activities to update overdue list
      } else {
        console.error("[v0] Activity save failed:", data)
        toast({
          title: "Error",
          description: data.error || "Failed to log activity",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error adding activity:", error)
      toast({
        title: "Error",
        description: "Failed to log activity",
        variant: "destructive",
      })
    }
  }

  const handleEditActivity = async (activityId: string) => {
    // Check for required fields before editing
    if (
      !editingActivity.description.trim() ||
      !selectedAthlete ||
      !editingActivity.actionType ||
      !editingActivity.actionDate
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          actionType: editingActivity.actionType,
          description: editingActivity.description,
          actionDate: editingActivity.actionDate,
          outcome: editingActivity.outcome || null, // Ensure outcome is null if empty
          followUpDate: editingActivity.followUpDate || null, // Include followUpDate
        }),
      })

      if (response.ok) {
        setEditingActivityId(null)
        // Reset editing state
        setEditingActivity({
          actionType: "",
          description: "",
          actionDate: "",
          outcome: "",
          followUpDate: "", // Reset followUpDate
        })
        // Refresh activities list for the selected athlete
        if (selectedAthlete) {
          fetchActivities(selectedAthlete.id)
        }
        await fetchActivities() // Refetch all activities to update overdue list
      } else {
        const errorData = await response.json()
        console.error("Error editing activity:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to update activity",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error editing activity:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating activity",
        variant: "destructive",
      })
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!selectedAthlete || !confirm("Are you sure you want to delete this activity?")) return

    try {
      const response = await fetch(`/api/coach-portal/activities?activityId=${activityId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Activity deleted successfully",
        })
        // Refresh activities list
        if (selectedAthlete) {
          fetchActivities(selectedAthlete.id)
        }
        await fetchActivities() // Refetch all activities to update overdue list
      } else {
        const errorData = await response.json()
        console.error("Error deleting activity:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete activity",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting activity:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting activity",
        variant: "destructive",
      })
    }
  }

  const handleAddFamilyMember = async () => {
    console.log("[v0] Family form submitted:", {
      name: newFamilyMember.name,
      relationship: newFamilyMember.relationship,
      hasName: !!newFamilyMember.name.trim(),
      hasRelationship: !!newFamilyMember.relationship.trim(),
      hasAthlete: !!selectedAthlete,
    })

    if (!newFamilyMember.name.trim()) {
      console.log("[v0] Validation failed: Name is required")
      alert("Please enter a name")
      return
    }

    if (!newFamilyMember.relationship.trim()) {
      console.log("[v0] Validation failed: Relationship is required")
      alert("Please select a relationship")
      return
    }

    if (!selectedAthlete) {
      console.log("[v0] Validation failed: No athlete selected")
      return
    }

    console.log("[v0] Adding family member:", { athleteId: selectedAthlete.id, familyMember: newFamilyMember })

    try {
      const response = await fetch("/api/coach-portal/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          name: newFamilyMember.name,
          relationship: newFamilyMember.relationship,
          phone: newFamilyMember.phone || null,
          email: newFamilyMember.email || null,
        }),
      })

      console.log("[v0] Family member save response:", { status: response.status, ok: response.ok })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Family member saved successfully:", data)
        setNewFamilyMember({
          name: "",
          relationship: "",
          phone: "",
          email: "",
        })
        setShowFamilyForm(false)
        fetchFamilyMembers(selectedAthlete.id)
      } else {
        const errorText = await response.text()
        console.error("[v0] Family member save failed:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error adding family member:", error)
    }
  }

  const handleUploadDocument = async (file: File) => {
    if (!selectedAthlete) return

    setUploadingDocument(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("athleteId", selectedAthlete.id)

      const response = await fetch("/api/coach-portal/documents", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        fetchDocuments(selectedAthlete.id)
      }
    } catch (error) {
      console.error("Error uploading document:", error)
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedAthlete || !confirm("Are you sure you want to delete this document?")) return

    console.log("[v0] Deleting document:", { documentId, athleteId: selectedAthlete.id })

    try {
      const response = await fetch(`/api/coach-portal/documents?documentId=${documentId}`, {
        method: "DELETE",
      })

      console.log("[v0] Document delete response:", { status: response.status, ok: response.ok })

      if (response.ok) {
        console.log("[v0] Document deleted successfully")
        fetchDocuments(selectedAthlete.id)
      } else {
        const errorText = await response.text()
        console.error("[v0] Document delete failed:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error deleting document:", error)
    }
  }

  const handleDeleteFamilyMember = async (familyMemberId: string) => {
    if (!selectedAthlete || !confirm("Are you sure you want to delete this family member?")) return

    try {
      const response = await fetch(`/api/coach-portal/family?familyMemberId=${familyMemberId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFamilyMembers(selectedAthlete.id)
      }
    } catch (error) {
      console.error("Error deleting family member:", error)
    }
  }

  const handleStageChange = async (prospectId: string, newStage: string) => {
    console.log("[v0] Stage change requested:", { prospectId, newStage, currentProspects: prospects.length })

    const previousProspects = [...prospects]
    const previousSelectedAthlete = selectedAthlete ? { ...selectedAthlete } : null

    setProspects((prevProspects) =>
      prevProspects.map((p) => (p.id === prospectId ? { ...p, pipeline_stage: newStage } : p)),
    )

    if (selectedAthlete?.id === prospectId) {
      setSelectedAthlete((prev) => (prev ? { ...prev, pipeline_stage: newStage } : null))
    }

    console.log("[v0] Optimistic update applied, calling API...")

    try {
      const response = await fetch("/api/coach-portal/update-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: prospectId,
          stage: newStage,
          schoolId: params.schoolId,
        }),
      })

      console.log("[v0] API response:", { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Stage update failed:", errorData)

        setProspects(previousProspects)
        if (previousSelectedAthlete) {
          setSelectedAthlete(previousSelectedAthlete)
        }

        alert("Failed to update stage. Please try again.")
        return
      }

      const data = await response.json()
      console.log("[v0] Stage update successful:", data)

      if (selectedAthlete?.id === prospectId) {
        fetchActivities(prospectId)
      }
    } catch (error) {
      console.error("[v0] Error updating stage:", error)

      setProspects(previousProspects)
      if (previousSelectedAthlete) {
        setSelectedAthlete(previousSelectedAthlete)
      }

      alert("Network error. Please check your connection and try again.")
    }
  }

  const handleDragStart = (prospect: Prospect) => {
    console.log("[v0] Drag started:", { name: prospect.name, stage: prospect.pipeline_stage })
    setDraggedProspect(prospect)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (stageId: string) => {
    console.log("[v0] Drop event:", {
      stageId,
      draggedProspect: draggedProspect?.name,
      draggedStage: draggedProspect?.pipeline_stage,
    })

    if (draggedProspect) {
      console.log("[v0] Calling handleStageChange from drop")
      handleStageChange(draggedProspect.id, stageId)
      setDraggedProspect(null)
    } else {
      console.log("[v0] No dragged prospect found")
    }
  }

  const openAthleteModal = (prospect: Prospect) => {
    setSelectedAthlete(prospect)
    fetchNotes(prospect.id)
    fetchActivities(prospect.id)
    fetchNchsaaResults(prospect.id)
    fetchDocuments(prospect.id)
    fetchFamilyMembers(prospect.id)
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

    return matchesSearch && matchesYear && matchesGender
  })

  console.log("[v0] Filtered prospects:", {
    total: prospects.length,
    filtered: filteredProspects.length,
    searchTerm,
    selectedYear,
    selectedGender,
  })

  const graduationYears = [...new Set(prospects.map((p) => p.graduationyear).filter(Boolean))].sort((a, b) => a - b)

  const normalizeStage = (stage: string | null | undefined): string => {
    const normalized = (stage || "Prospect").trim()
    
    // Map legacy/invalid stages to valid ones
    const stageLower = normalized.toLowerCase()
    if (stageLower === "college athlete" || stageLower === "current college athlete") {
      return "Signed"
    }
    if (stageLower === "contacted" || stageLower === "reached out") {
      return "Prospect"
    }
    
    return normalized
  }

  const getProspectsByStage = (stageId: string) => {
    const stageProspects = filteredProspects.filter((p) => {
      const prospectStage = normalizeStage(p.pipeline_stage)
      const targetStage = stageId.trim()
      // Case-insensitive comparison to handle "prospect" vs "Prospect"
      return prospectStage.toLowerCase() === targetStage.toLowerCase()
    })
    console.log(`[v0] Stage "${stageId}" prospects:`, {
      count: stageProspects.length,
      prospects: stageProspects.map((p) => ({ name: p.name, stage: p.pipeline_stage, normalized: normalizeStage(p.pipeline_stage) })),
    })
    return stageProspects
  }

  const stageCounts = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.label] = getProspectsByStage(stage.id).length
      return acc
    },
    {} as Record<string, number>,
  )

  const calculateStats = () => {
    const total = filteredProspects.length
    const lost = getProspectsByStage("Lost").length // Use getProspectsByStage for consistency
    const offersOut = getProspectsByStage("Offered").length
    const committed = getProspectsByStage("Committed").length

    return { total, lost, offersOut, committed }
  }

  const stats = calculateStats()

  if (authLoading || isLoading || brandingLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading portal...</p>
        </div>
      </div>
    )
  }

  // Show loading state while school branding is being fetched
  if (brandingLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if school branding couldn't be loaded
  if (!schoolBranding) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">School not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SchoolBrandedHeader
        schoolId={params.schoolId}
        schoolName={schoolBranding?.name || ""}
        subtitle={`${filteredProspects.length} Active Prospects`}
      />

      {profile?.is_admin && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="container mx-auto px-4 py-2">
            <Badge variant="secondary" className="bg-blue-600 text-white">
              ADMIN PREVIEW MODE
            </Badge>
          </div>
        </div>
      )}

      {/* Mobile-only Quick Actions Bar */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                dashboardRef.current?.openCreateActivity()
              }}
              className="flex-1 h-12 px-4 rounded-lg font-semibold bg-gray-900 text-white shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all touch-manipulation"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Activity
            </Button>
            <Button
              onClick={() => {
                console.log("[v0] Add Prospect button clicked - redirecting to public rankings")
                window.location.href = "https://app.ncwrestlingunited.com/public-rankings"
              }}
              className="flex-1 h-12 px-4 rounded-lg font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all touch-manipulation"
              style={{
                backgroundColor: schoolBranding?.primary_color || "#3B82F6",
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Prospect
            </Button>
          </div>
        </div>
      </div>

      {activities.filter((a) => {
        if (!a.follow_up_date) return false
        const followUpDate = new Date(a.follow_up_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return followUpDate < today
      }).length > 0 && (
        <div className="container mx-auto px-4 pb-4">
          <Card className="border-2 border-red-300 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Overdue Follow-ups
                <Badge variant="destructive" className="ml-auto">
                  {
                    activities.filter((a) => {
                      if (!a.follow_up_date) return false
                      const followUpDate = new Date(a.follow_up_date)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return followUpDate < today
                    }).length
                  }
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activities
                  .filter((a) => {
                    if (!a.follow_up_date) return false
                    const followUpDate = new Date(a.follow_up_date)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return followUpDate < today
                  })
                  .map((activity) => (
                    <div key={activity.id} className="bg-white p-3 rounded-lg border border-red-200">
                      <div className="flex items-start gap-3">
                        <img
                          src={activity.athlete_photo || "/placeholder.svg?height=40&width=40"}
                          alt={activity.athlete_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{activity.athlete_name}</p>
                          <p className="text-xs text-gray-600">
                            {activity.action_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-red-600 font-medium mt-1">
                            Due:{" "}
                            {new Date(activity.follow_up_date!).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NC Roster History Section */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <Collapsible open={isRosterHistoryOpen} onOpenChange={setIsRosterHistoryOpen}>
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">NC Roster History</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      North Carolina athletes who were recruited and are now enrolled at {schoolBranding?.name || "this school"}
                    </p>
                  </div>
                  <ChevronDown 
                    className={`h-6 w-6 text-gray-500 transition-transform ${isRosterHistoryOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-6">
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-gray-400">Loading roster history...</div>
              </div>
            ) : pipelineHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No historical NC athletes found. Athletes with "College Athlete" status will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-gray-50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Class Year</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Weight</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">High School</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Current Status</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Roster Status</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Years on Team</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {pipelineHistory.map((athlete) => (
                      <tr
                        key={athlete.id}
                        className="border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-muted"
                      >
                        <td className="p-4 align-middle font-medium">{athlete.year || "-"}</td>
                        <td className="p-4 align-middle font-medium">{athlete.name || "-"}</td>
                        <td className="p-4 align-middle">{athlete.weight ? `${athlete.weight}lbs` : "-"}</td>
                        <td className="p-4 align-middle">{athlete.highschool || "-"}</td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {athlete.status || "Enrolled"}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge 
                            variant="outline" 
                            className={
                              athlete.roster_status === "Active" 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          >
                            {athlete.roster_status || "Active"}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle text-gray-600">
                          {athlete.years_on_team || "Current"}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRosterEntry(athlete)
                                setRosterEditForm({
                                  roster_status: athlete.roster_status || "Active",
                                  roster_notes: athlete.roster_notes || "",
                                })
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove ${athlete.name} from roster history?`)) {
                                  handleDeleteRosterEntry(athlete.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* North Carolina Recruits Section */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Committed Recruits</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              North Carolina athletes committed or signed to {schoolBranding?.name || "this school"}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {loadingNcRecruits ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-gray-400">Loading recruits...</div>
              </div>
            ) : ncRecruits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No committed/signed recruits found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-gray-50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Year</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Weight</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">High School</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">College</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Division</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {ncRecruits.map((recruit) => (
                      <tr
                        key={recruit.id}
                        className="border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-muted"
                      >
                        <td className="p-4 align-middle font-medium">{recruit.year || "-"}</td>
                        <td className="p-4 align-middle font-medium">{recruit.name || "-"}</td>
                        <td className="p-4 align-middle">{recruit.weight ? `${recruit.weight}lbs` : "-"}</td>
                        <td className="p-4 align-middle">{recruit.highschool || "-"}</td>
                        <td className="p-4 align-middle">{recruit.college || "-"}</td>
                        <td className="p-4 align-middle">
                          {recruit.division ? (
                            <Badge variant="outline" className="text-xs">
                              {recruit.division}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <Badge
                            variant="outline"
                            className={
                              recruit.status?.toLowerCase() === "signed"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {recruit.status || "Committed"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto px-4 py-6" data-recruiting-dashboard>
        <RecruitingActionsDashboard 
          ref={dashboardRef}
          schoolId={params.schoolId} 
          athletes={prospects.map(p => ({ id: p.id, name: p.name }))} 
        />
      </div>

      <div className="container mx-auto px-4 py-6">
        <RecruitingFunnelChart stageCounts={stageCounts} schoolBranding={schoolBranding} />
      </div>

      <div className="container mx-auto px-4 pb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* Total Pipeline - Primary metric with school branding */}
          <div
            className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-white rounded-xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            style={{
              borderColor: schoolBranding?.primary_color || "#3B82F6", // Use schoolBranding
            }}
          >
            <Users
              className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0"
              style={{ color: schoolBranding?.primary_color || "#3B82F6" }} // Use schoolBranding
            />
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total Pipeline
              </div>
            </div>
          </div>

          {/* Lost to Others - Negative metric */}
          <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-red-50 rounded-xl border-2 border-red-200 hover:border-red-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
            <Target className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0 text-red-600" />
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold text-red-600">{stats.lost}</div>
              <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Lost to Others
              </div>
            </div>
          </div>

          {/* Offers Out - Informational */}
          <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
            <Target className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0 text-blue-600" />
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold text-blue-600">{stats.offersOut}</div>
              <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Offers Out
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
            <div className="relative flex-1 min-w-full md:min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-[18px] w-[18px]" />
              <Input
                placeholder="Search athletes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-gray-200 focus:border-gray-900 bg-white text-gray-900 placeholder:text-gray-400 h-11 rounded-lg transition-colors"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex gap-3">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="flex-1 md:w-[150px] border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-900 h-11 rounded-lg font-medium touch-manipulation">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all">All Years</SelectItem>
                    {graduationYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        Class of {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="flex-1 md:w-[150px] border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-900 h-11 rounded-lg font-medium touch-manipulation">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Men's</SelectItem>
                    <SelectItem value="female">Women's</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 border-2 border-gray-200 rounded-lg p-1 bg-white w-full md:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("board")}
                  className={`flex-1 md:flex-none h-11 md:h-9 px-3 touch-manipulation ${viewMode === "board" ? "bg-gray-100" : ""}`}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <span className="text-sm">Board</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`flex-1 md:flex-none h-11 md:h-9 px-3 touch-manipulation ${viewMode === "table" ? "bg-gray-100" : ""}`}
                >
                  <Table className="h-4 w-4 mr-2" />
                  <span className="text-sm">Table</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={() => {
                console.log("[v0] Add Prospect button clicked - redirecting to public rankings")
                window.location.href = "https://app.ncwrestlingunited.com/public-rankings"
              }}
              className="hidden md:flex h-11 px-5 rounded-lg font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all md:w-auto touch-manipulation"
              style={{
                backgroundColor: schoolBranding?.primary_color || "#3B82F6", // Use schoolBranding
              }}
            >
              <Plus className="h-[18px] w-[18px] mr-2" />
              Add Prospect
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {viewMode === "board" ? (
          <div className="flex flex-col md:flex-row md:gap-4 md:overflow-x-auto md:pb-4 space-y-4 md:space-y-0">
            {PIPELINE_STAGES.map((stage) => {
            const stageProspects = getProspectsByStage(stage.id)
            return (
              <div
                key={stage.id}
                className="md:flex-shrink-0 md:w-80"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="bg-white rounded-xl border-2 border-gray-200 flex flex-col transition-all hover:border-gray-300">
                  <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b-2 border-gray-100">
                    <h3 className="text-xs md:text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {stage.label}
                    </h3>
                    <div
                      className="flex items-center justify-center min-w-[24px] md:min-w-[28px] h-[24px] md:h-[28px] px-2 md:px-2.5 rounded-full text-xs md:text-sm font-bold text-white"
                      style={{ backgroundColor: schoolBranding?.primary_color || "#3B82F6" }} // Use schoolBranding
                    >
                      {stageProspects.length}
                    </div>
                  </div>

                  <div className="flex-1 p-3 md:p-4 space-y-3 min-h-[200px] md:min-h-[400px] max-h-[400px] md:max-h-[calc(100vh-400px)] overflow-y-auto">
                    {stageProspects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                        <div className="text-4xl md:text-5xl opacity-10 mb-2 md:mb-3">📋</div>
                        <div className="text-xs md:text-sm font-semibold text-gray-600 mb-1">No athletes yet</div>
                        <div className="text-[10px] md:text-xs text-gray-400">
                          Drag athletes here or add new prospects
                        </div>
                      </div>
                    ) : (
                      stageProspects.map((prospect) => (
                        <Card
                          key={prospect.id}
                          draggable
                          onDragStart={() => handleDragStart(prospect)}
                          onClick={() => openAthleteModal(prospect)}
                          className="bg-gray-50 border-2 border-gray-200 hover:border-gray-900 active:border-gray-900 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-grab active:cursor-grabbing transition-all rounded-lg touch-manipulation"
                        >
                          <CardContent className="p-3 md:p-4">
                            <div className="flex gap-3 mb-3 relative">
                              <img
                                src={prospect.photourl || "/placeholder.svg?height=56&width=56&query=wrestler"}
                                alt={prospect.name}
                                className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border-2 border-gray-200 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm md:text-base text-gray-900 truncate mb-1">
                                  {prospect.name}
                                </h4>
                                <p className="text-xs md:text-sm text-gray-600 font-semibold mb-1">
                                  {prospect.graduationyear} • {prospect.weightclass}lbs
                                </p>
                                <p className="text-[10px] md:text-xs text-gray-400 truncate">{prospect.highschool}</p>
                              </div>
                              {prospect.prospect_ranking && prospect.prospect_ranking <= 25 && (
                                <div
                                  className="absolute top-0 right-0 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-xs md:text-sm font-bold text-white"
                                  style={{ backgroundColor: schoolBranding?.primary_color || "#3B82F6" }} // Use schoolBranding
                                >
                                  #{prospect.prospect_ranking}
                                </div>
                              )}
                            </div>

                            {prospect.academic_gpa && (
                              <div className="flex gap-2 mb-3">
                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 md:px-3 py-1.5 md:py-2 rounded-md">
                                  <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-600" />
                                  <span className="text-xs md:text-sm font-bold text-gray-900">
                                    {prospect.academic_gpa.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <button 
                                className="p-2 md:p-1.5 hover:scale-110 active:scale-95 transition-transform touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Handle star toggle if needed
                                }}
                              >
                                <Star
                                  className={`h-5 w-5 md:h-5 md:w-5 ${prospect.is_starred ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                />
                              </button>
                              <span className="text-[10px] md:text-xs text-gray-500 font-medium">
                                {formatLastContactDate(getLastContactedDate(prospect.id))}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="md:hidden text-xs text-gray-500 px-4 py-2 bg-gray-50 border-b">
                ← Swipe to see more columns →
              </div>
              <table className="w-full caption-bottom text-sm min-w-[800px]">
                <thead className="[&_tr]:border-b bg-gray-50">
                  <tr className="border-b transition-colors">
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Name</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Year</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Weight</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">High School</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Stage</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">GPA</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Ranking</th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-gray-900">Last Contact</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredProspects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        No prospects found
                      </td>
                    </tr>
                  ) : (
                    filteredProspects.map((prospect) => {
                      const stage = PIPELINE_STAGES.find(s => s.id === prospect.pipeline_stage) || PIPELINE_STAGES[0]
                      return (
                        <tr
                          key={prospect.id}
                          onClick={() => openAthleteModal(prospect)}
                          className="border-b transition-colors hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-manipulation"
                        >
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <img
                                src={prospect.photourl || "/placeholder.svg?height=40&width=40&query=wrestler"}
                                alt={prospect.name}
                                className="w-10 h-10 rounded-lg object-cover border-2 border-gray-200"
                              />
                              <span className="font-medium text-gray-900">{prospect.name}</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-gray-600">{prospect.graduationyear}</td>
                          <td className="p-4 align-middle text-gray-600">{prospect.weightclass}lbs</td>
                          <td className="p-4 align-middle text-gray-600">{prospect.highschool || "-"}</td>
                          <td className="p-4 align-middle">
                            <Badge
                              className="text-xs"
                              style={{
                                backgroundColor: stage.color || "#6B7280",
                                color: "white",
                              }}
                            >
                              {stage.label}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-gray-600">
                            {prospect.academic_gpa ? prospect.academic_gpa.toFixed(1) : "-"}
                          </td>
                          <td className="p-4 align-middle text-gray-600">
                            {prospect.prospect_ranking ? `#${prospect.prospect_ranking}` : "-"}
                          </td>
                          <td className="p-4 align-middle text-gray-600 text-sm">
                            {formatLastContactDate(getLastContactedDate(prospect.id))}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedAthlete} onOpenChange={() => setSelectedAthlete(null)}>
        <DialogContent className="max-w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] p-0 bg-white border-0 md:border md:border-gray-200 text-gray-900 md:rounded-lg flex flex-col [&>button]:hidden">
          {selectedAthlete && (
            <>
              <DialogHeader className="pb-4 p-4 md:p-6 sticky top-0 bg-white z-10 border-b border-gray-200 relative">
                {/* Close button - prominent on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-20 h-10 w-10 md:h-8 md:w-8 rounded-full bg-white shadow-lg border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all md:right-4 md:top-4 touch-manipulation"
                  onClick={() => setSelectedAthlete(null)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5 md:h-4 md:w-4 text-gray-700" />
                </Button>
                <div className="flex items-start gap-4 pr-12 md:pr-0">
                  <img
                    src={selectedAthlete.photourl || "/placeholder.svg?height=80&width=80&query=wrestler"}
                    alt={selectedAthlete.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl md:text-2xl text-gray-900 mb-1">{selectedAthlete.name}</DialogTitle>
                    <DialogDescription className="text-sm md:text-base text-gray-600 mb-2">
                      {selectedAthlete.highschool} • {selectedAthlete.wrestlingClub}
                    </DialogDescription>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-600 text-xs md:text-sm">
                        Class of {selectedAthlete.graduationyear}
                      </Badge>
                      <Badge className="bg-purple-600 text-xs md:text-sm">{selectedAthlete.weightclass}lbs</Badge>
                      {selectedAthlete.prospect_ranking && (
                        <Badge className="bg-yellow-500 text-black text-xs md:text-sm">
                          Ranked #{selectedAthlete.prospect_ranking}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50" style={{ WebkitOverflowScrolling: 'touch' }}>
                <Tabs defaultValue="overview" className="mt-0">
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="md:hidden text-xs text-gray-500 px-4 py-2 bg-gray-50 border-b -mx-4 mb-2">
                      ← Swipe to see more tabs →
                    </div>
                    <TabsList className="bg-white border border-gray-200 inline-flex md:grid md:grid-cols-8 gap-1 w-max md:w-full">
                      <TabsTrigger
                        value="overview"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Overview
                      </TabsTrigger>
                      <TabsTrigger
                        value="performance"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Performance
                      </TabsTrigger>
                      <TabsTrigger
                        value="academics"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Academics
                      </TabsTrigger>
                      <TabsTrigger
                        value="documents"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Documents
                      </TabsTrigger>
                      <TabsTrigger
                        value="family"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Family
                      </TabsTrigger>
                      <TabsTrigger
                        value="notes"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Notes ({notes.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="financials"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Financials
                      </TabsTrigger>
                      <TabsTrigger
                        value="activity"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-gray-100 touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Activity
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Contact Information</h3>
                      <div className="space-y-1 md:space-2 text-sm">
                        {selectedAthlete.contactEmail && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <a
                              href={`mailto:${selectedAthlete.contactEmail}`}
                              className="hover:text-blue-600 break-all"
                            >
                              {selectedAthlete.contactEmail}
                            </a>
                          </div>
                        )}
                        {selectedAthlete.phone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <a href={`tel:${selectedAthlete.phone}`} className="hover:text-blue-600">
                              {selectedAthlete.phone}
                            </a>
                          </div>
                        )}
                        {selectedAthlete.location && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            {selectedAthlete.location}
                          </div>
                        )}
                        {!selectedAthlete.contactEmail && !selectedAthlete.phone && !selectedAthlete.location && (
                          <p className="text-gray-500 italic">No contact information available</p>
                        )}
                      </div>
                    </div>

                    {selectedAthlete.bio && (
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Bio</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{selectedAthlete.bio}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Recruiting Stage</h3>
                      <Select
                        value={(selectedAthlete.pipeline_stage || "Prospect").toLowerCase()}
                        onValueChange={(value) => handleStageChange(selectedAthlete.id, value)}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="prospect" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              Prospect
                            </div>
                          </SelectItem>
                          <SelectItem value="contacted" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              Contacted
                            </div>
                          </SelectItem>
                          <SelectItem value="evaluating" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              Evaluating
                            </div>
                          </SelectItem>
                          <SelectItem value="recruiting" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              Recruiting
                            </div>
                          </SelectItem>
                          <SelectItem value="offered" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Offered
                            </div>
                          </SelectItem>
                          <SelectItem value="committed" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-600" />
                              Committed
                            </div>
                          </SelectItem>
                          <SelectItem value="signed" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                              Signed
                            </div>
                          </SelectItem>
                          <SelectItem value="lost" className="text-gray-900 hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Lost
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Public Profile</h3>
                      <a
                        href={`/unified-profile/${selectedAthlete.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Full RecruitNC Profile
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Tournament Results
                      </h3>

                      {nchsaaResults.length > 0 && (
                        <div className="mb-4">
                          <div className="text-sm font-semibold text-gray-900 mb-3">NCHSAA State Championships</div>
                          <div className="space-y-2">
                            {nchsaaResults.map((result, index) => (
                              <div key={index} className="bg-gray-100 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-lg font-bold text-blue-600">
                                      {result.place
                                        ? `${result.place}${result.place === 1 ? "st" : result.place === 2 ? "nd" : result.place === 3 ? "rd" : "th"} Place`
                                        : "Participant"}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {result.year} • {result.weight_class} • {result.classification}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAthlete.careerRecord ||
                      selectedAthlete.super_32_2024_record ||
                      selectedAthlete.nhsca_2024_record ||
                      selectedAthlete.super_32_2023_record ||
                      selectedAthlete.super_32_2023_placement ||
                      selectedAthlete.super_32_2024_record ||
                      selectedAthlete.super_32_2024_placement ||
                      selectedAthlete.super_32_2025_record ||
                      selectedAthlete.super_32_2025_placement ||
                      selectedAthlete.nhsca_2024_record ||
                      selectedAthlete.nhsca_2024_placement ||
                      selectedAthlete.nhsca_2025_record ||
                      selectedAthlete.nhsca_2025_placement ||
                      selectedAthlete.college_opens_experience ? (
                        <div className="space-y-4">
                          {selectedAthlete.careerRecord && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-xs text-gray-600 mb-1">Career Record</div>
                              <div className="text-2xl font-bold text-gray-900">{selectedAthlete.careerRecord}</div>
                            </div>
                          )}

                          {(selectedAthlete.super_32_2023_record || selectedAthlete.super_32_2023_placement) && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-sm font-semibold text-gray-900 mb-2">Super 32 2023</div>
                              {selectedAthlete.super_32_2023_record && (
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                  {selectedAthlete.super_32_2023_record}
                                </div>
                              )}
                              {selectedAthlete.super_32_2023_placement && (
                                <div className="text-sm text-gray-700">{selectedAthlete.super_32_2023_placement}</div>
                              )}
                            </div>
                          )}

                          {(selectedAthlete.super_32_2024_record || selectedAthlete.super_32_2024_placement) && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-sm font-semibold text-gray-900 mb-2">Super 32 2024</div>
                              {selectedAthlete.super_32_2024_record && (
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                  {selectedAthlete.super_32_2024_record}
                                </div>
                              )}
                              {selectedAthlete.super_32_2024_placement && (
                                <div className="text-sm text-gray-700">{selectedAthlete.super_32_2024_placement}</div>
                              )}
                            </div>
                          )}

                          {(selectedAthlete.super_32_2025_record || selectedAthlete.super_32_2025_placement) && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-sm font-semibold text-gray-900 mb-2">Super 32 2025</div>
                              {selectedAthlete.super_32_2025_record && (
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                  {selectedAthlete.super_32_2025_record}
                                </div>
                              )}
                              {selectedAthlete.super_32_2025_placement && (
                                <div className="text-sm text-gray-700">{selectedAthlete.super_32_2025_placement}</div>
                              )}
                            </div>
                          )}

                          {(selectedAthlete.nhsca_2024_record || selectedAthlete.nhsca_2024_placement) && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-sm font-semibold text-gray-900 mb-2">NHSCA 2024</div>
                              {selectedAthlete.nhsca_2024_record && (
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                  {selectedAthlete.nhsca_2024_record}
                                </div>
                              )}
                              {selectedAthlete.nhsca_2024_placement && (
                                <div className="text-sm text-gray-700">{selectedAthlete.nhsca_2024_placement}</div>
                              )}
                            </div>
                          )}

                          {(selectedAthlete.nhsca_2025_record || selectedAthlete.nhsca_2025_placement) && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-sm font-semibold text-gray-900 mb-2">NHSCA 2025</div>
                              {selectedAthlete.nhsca_2025_record && (
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                  {selectedAthlete.nhsca_2025_record}
                                </div>
                              )}
                              {selectedAthlete.nhsca_2025_placement && (
                                <div className="text-sm text-gray-700">{selectedAthlete.nhsca_2025_placement}</div>
                              )}
                            </div>
                          )}

                          {selectedAthlete.college_opens_experience && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-sm font-semibold text-gray-900 mb-2">College Opens</div>
                              <div className="text-sm text-gray-700">{selectedAthlete.college_opens_experience}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No tournament results available</p>
                      )}
                    </div>

                    {selectedAthlete.achievements && selectedAthlete.achievements.length > 0 && (
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Achievements</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedAthlete.achievements.map((achievement, index) => (
                            <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                              {achievement}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedAthlete.prospect_ranking && (
                      <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Rankings</h3>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                          <div className="text-sm text-yellow-500 mb-1">Prospect Ranking</div>
                          <div className="text-3xl font-bold text-yellow-500">#{selectedAthlete.prospect_ranking}</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="academics" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Academic Profile
                      </h3>

                      {selectedAthlete.academic_gpa || selectedAthlete.academic_sat || selectedAthlete.academic_act ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {selectedAthlete.academic_gpa && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-xs text-gray-600 mb-1">GPA</div>
                              <div className="text-3xl font-bold text-blue-600">
                                {selectedAthlete.academic_gpa.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">4.0 Scale</div>
                            </div>
                          )}
                          {selectedAthlete.academic_sat && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-xs text-gray-600 mb-1">SAT</div>
                              <div className="text-3xl font-bold text-blue-600">{selectedAthlete.academic_sat}</div>
                              <div className="text-xs text-gray-500 mt-1">Out of 1600</div>
                            </div>
                          )}
                          {selectedAthlete.academic_act && (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="text-xs text-gray-600 mb-1">ACT</div>
                              <div className="text-3xl font-bold text-blue-600">{selectedAthlete.academic_act}</div>
                              <div className="text-xs text-gray-500 mt-1">Out of 36</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No academic information available</p>
                      )}

                      {selectedAthlete.academic_summary && (
                        <div className="mt-4 bg-gray-100 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-900 mb-2">Academic Summary</div>
                          <p className="text-sm text-gray-700">{selectedAthlete.academic_summary}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents & Media
                      </h3>

                      <div className="mb-4">
                        <label className="block">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer transition-colors">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadDocument(file)
                              }}
                              disabled={uploadingDocument}
                            />
                            <Plus className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                            <div className="text-sm text-gray-600">
                              {uploadingDocument ? "Uploading..." : "Click to upload document"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">PDF, DOC, or images</div>
                          </div>
                        </label>
                      </div>

                      {selectedAthlete.highlight_video_url && (
                        <div className="bg-gray-100 rounded-lg p-4 mb-3">
                          <div className="flex items-center gap-3 mb-2">
                            <Video className="h-5 w-5 text-blue-600" />
                            <div className="text-sm font-semibold text-gray-900">Highlight Video</div>
                          </div>
                          <a
                            href={selectedAthlete.highlight_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Watch Highlights
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}

                      {documents.length > 0 && (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.id} className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{doc.file_name}</div>
                                  <div className="text-xs text-gray-600">
                                    {new Date(doc.uploaded_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 p-1"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!selectedAthlete.highlight_video_url && documents.length === 0 && (
                        <p className="text-gray-500 italic">No documents or media uploaded yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="family" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Family Information
                        </h3>
                        <Button
                          onClick={() => setShowFamilyForm(!showFamilyForm)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Family Member
                        </Button>
                      </div>

                      {showFamilyForm && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3 border border-gray-200">
                          <Input
                            placeholder="Name *"
                            value={newFamilyMember.name}
                            onChange={(e) => setNewFamilyMember({ ...newFamilyMember, name: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                          <Select
                            value={newFamilyMember.relationship}
                            onValueChange={(value) => setNewFamilyMember({ ...newFamilyMember, relationship: value })}
                          >
                            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                              <SelectValue placeholder="Relationship *" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Guardian">Guardian</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Phone"
                            value={newFamilyMember.phone}
                            onChange={(e) => setNewFamilyMember({ ...newFamilyMember, phone: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={newFamilyMember.email}
                            onChange={(e) => setNewFamilyMember({ ...newFamilyMember, email: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleAddFamilyMember} className="bg-blue-600 hover:bg-blue-700">
                              Save Family Member
                            </Button>
                            <Button
                              onClick={() => setShowFamilyForm(false)}
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {familyMembers.length > 0 ? (
                        <div className="space-y-3">
                          {familyMembers.map((member) => (
                            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                                  <div className="text-xs text-gray-600">{member.relationship}</div>
                                </div>
                                <button
                                  onClick={() => handleDeleteFamilyMember(member.id)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              {(member.phone || member.email) && (
                                <div className="space-y-1 mt-2">
                                  {member.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                                      <a href={`tel:${member.phone}`} className="hover:text-blue-600">
                                        {member.phone}
                                      </a>
                                    </div>
                                  )}
                                  {member.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                      <Mail className="h-3.5 w-3.5 text-gray-500" />
                                      <a href={`mailto:${member.email}`} className="hover:text-blue-600">
                                        {member.email}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No family information available</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
                    {/* Add Note */}
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 md:mb-3">Add Note</h3>
                      <Textarea
                        placeholder="Add recruiting notes, call summaries, or observations..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 mb-3"
                        rows={3}
                      />
                      <Button onClick={handleAddNote} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {note.note_type || "General"}
                            </Badge>
                            <div className="flex items-center gap-1 md:gap-2">
                              <span className="text-xs text-gray-500">
                                {new Date(note.created_at).toLocaleDateString()}
                                {" at "}
                                {new Date(note.created_at).toLocaleTimeString()}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id)
                                  setEditingNoteText(note.note)
                                }}
                                className="p-0.5 md:p-1 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-0.5 md:p-1 hover:bg-gray-100 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                className="bg-white border-gray-300 text-gray-900"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleEditNote(note.id)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingNoteId(null)
                                    setEditingNoteText("")
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700">{note.note}</p>
                          )}
                        </div>
                      ))}

                      {notes.length === 0 && (
                        <div className="text-center py-4 md:py-8 text-gray-600">
                          No notes yet. Add your first note above.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="financials" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-lg p-4 md:p-6">
                      <h3 className="font-bold text-lg md:text-xl mb-2 flex items-center gap-2">
                        <span className="text-yellow-300">💰</span> Financial Information
                      </h3>
                      <p className="text-sm text-green-100">
                        Track financial aid needs, scholarship requirements, and financial considerations for this recruit.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {/* EFC (Expected Family Contribution) */}
                      <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                        <Label htmlFor="efc" className="text-base font-semibold mb-2 block">
                          Expected Family Contribution (EFC)
                        </Label>
                        <Input
                          id="efc"
                          type="number"
                          placeholder="Enter EFC amount"
                          value={financialData.efc}
                          onChange={(e) => setFinancialData({ ...financialData, efc: e.target.value })}
                          className="mb-2"
                        />
                        <p className="text-xs text-gray-500">
                          The amount the family is expected to contribute toward college costs
                        </p>
                      </div>

                      {/* Ability to Pay */}
                      <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                        <Label htmlFor="abilityToPay" className="text-base font-semibold mb-2 block">
                          Ability to Pay
                        </Label>
                        <Select
                          value={financialData.abilityToPay}
                          onValueChange={(value) => setFinancialData({ ...financialData, abilityToPay: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ability to pay" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Pay</SelectItem>
                            <SelectItem value="partial">Partial Need</SelectItem>
                            <SelectItem value="significant">Significant Need</SelectItem>
                            <SelectItem value="full_need">Full Need</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Aid Application Status */}
                      <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                        <Label htmlFor="aidApplicationStatus" className="text-base font-semibold mb-2 block">
                          Aid Application Status
                        </Label>
                        <Select
                          value={financialData.aidApplicationStatus}
                          onValueChange={(value) => setFinancialData({ ...financialData, aidApplicationStatus: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="fafsa_submitted">FAFSA Submitted</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="not_applying">Not Applying</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Merit Scholarship Eligible */}
                      <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                        <Label className="text-base font-semibold mb-2 block">Eligibility</Label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="meritEligible"
                              checked={financialData.meritScholarshipEligible}
                              onCheckedChange={(checked) =>
                                setFinancialData({ ...financialData, meritScholarshipEligible: checked as boolean })
                              }
                            />
                            <Label htmlFor="meritEligible" className="text-sm font-normal cursor-pointer">
                              Merit Scholarship Eligible
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="needBasedEligible"
                              checked={financialData.needBasedAidEligible}
                              onCheckedChange={(checked) =>
                                setFinancialData({ ...financialData, needBasedAidEligible: checked as boolean })
                              }
                            />
                            <Label htmlFor="needBasedEligible" className="text-sm font-normal cursor-pointer">
                              Need-Based Aid Eligible
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Aid Needs */}
                    <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                      <Label htmlFor="aidNeeds" className="text-base font-semibold mb-2 block">
                        Financial Aid Needs
                      </Label>
                      <Textarea
                        id="aidNeeds"
                        placeholder="Describe the athlete's/family's financial aid needs and requirements..."
                        value={financialData.aidNeeds}
                        onChange={(e) => setFinancialData({ ...financialData, aidNeeds: e.target.value })}
                        rows={4}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        Specific financial aid needs, amounts required, or special circumstances
                      </p>
                    </div>

                    {/* Scholarship Requirements */}
                    <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                      <Label htmlFor="scholarshipRequirements" className="text-base font-semibold mb-2 block">
                        Scholarship Requirements / Needs
                      </Label>
                      <Textarea
                        id="scholarshipRequirements"
                        placeholder="Note any specific scholarship requirements or amounts needed..."
                        value={financialData.scholarshipRequirements}
                        onChange={(e) => setFinancialData({ ...financialData, scholarshipRequirements: e.target.value })}
                        rows={4}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        Required scholarship amounts, athletic scholarship needs, or merit scholarship requirements
                      </p>
                    </div>

                    {/* Financial Concerns */}
                    <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                      <Label htmlFor="financialConcerns" className="text-base font-semibold mb-2 block">
                        Financial Concerns
                      </Label>
                      <Textarea
                        id="financialConcerns"
                        placeholder="Any financial concerns, constraints, or considerations..."
                        value={financialData.financialConcerns}
                        onChange={(e) => setFinancialData({ ...financialData, financialConcerns: e.target.value })}
                        rows={3}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        Any financial concerns that may affect enrollment decisions
                      </p>
                    </div>

                    {/* Financial Notes */}
                    <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                      <Label htmlFor="financialNotes" className="text-base font-semibold mb-2 block">
                        Additional Financial Notes
                      </Label>
                      <Textarea
                        id="financialNotes"
                        placeholder="Any additional financial information or notes..."
                        value={financialData.financialNotes}
                        onChange={(e) => setFinancialData({ ...financialData, financialNotes: e.target.value })}
                        rows={4}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        General notes about financial situation, discussions with family, or important details
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveFinancials}
                        disabled={isSavingFinancials}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSavingFinancials ? "Saving..." : "Save Financial Information"}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4 md:mt-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Log Activity</h3>
                        <Button
                          onClick={() => setShowActivityDialog(!showActivityDialog)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {showActivityDialog ? "Cancel" : "New Activity"}
                        </Button>
                      </div>

                      {showActivityDialog && (
                        <div className="space-y-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newActivity.isScheduled}
                                onChange={(e) =>
                                  setNewActivity({
                                    ...newActivity,
                                    isScheduled: e.target.checked,
                                    // If scheduling future, default date to tomorrow, else today
                                    actionDate: e.target.checked
                                      ? new Date(Date.now() + 86400000).toISOString().split("T")[0]
                                      : new Date().toISOString().split("T")[0],
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">
                                {newActivity.isScheduled ? "Schedule Future Activity" : "Log Past Activity"}
                              </span>
                            </label>
                          </div>

                          {/* Activity Type Select */}
                          <Select
                            value={newActivity.actionType}
                            onValueChange={(value) =>
                              setNewActivity({
                                ...newActivity,
                                actionType: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                              <SelectValue placeholder="Select activity type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="text">Text Message</SelectItem>
                              <SelectItem value="visit">Campus Visit</SelectItem>
                              <SelectItem value="camp">Camp/Event</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="offer">Offer</SelectItem>
                              <SelectItem value="follow_up">Follow-up</SelectItem>
                              <SelectItem value="evaluation">Evaluation</SelectItem>
                              <SelectItem value="contact">Contact</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            type="date"
                            value={newActivity.actionDate}
                            onChange={(e) => setNewActivity({ ...newActivity, actionDate: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />

                          <Textarea
                            placeholder="Description of activity... *"
                            value={newActivity.description}
                            onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                            rows={3}
                          />

                          <Input
                            placeholder="Outcome (optional)"
                            value={newActivity.outcome}
                            onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                            className="bg-white border-gray-300 text-gray-900"
                          />

                          {/* Only show Follow-up Date input if isScheduled is true */}
                          {newActivity.isScheduled && (
                            <Input
                              type="date"
                              placeholder="Follow-up Date"
                              value={newActivity.followUpDate}
                              onChange={(e) => setNewActivity({ ...newActivity, followUpDate: e.target.value })}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          )}

                          <Button onClick={handleAddActivity} className="w-full bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            {newActivity.isScheduled ? "Schedule Activity" : "Save Activity"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Activity List */}
                    {activities.length > 0 ? (
                      <div className="space-y-2 mt-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className="text-xs uppercase">
                                {activity.action_type.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(activity.action_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{activity.description}</p>
                            {activity.outcome && (
                              <p className="text-xs text-gray-500 mt-1">Outcome: {activity.outcome}</p>
                            )}
                            {activity.follow_up_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Follow-up: {new Date(activity.follow_up_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 mt-4">
                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No activity yet. Interactions will appear here as you recruit this athlete.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Roster Entry Dialog */}
      <Dialog open={!!editingRosterEntry} onOpenChange={(open) => !open && setEditingRosterEntry(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Edit Roster Entry</DialogTitle>
            <DialogDescription>
              Update roster status for {editingRosterEntry?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="roster_status">Roster Status</Label>
              <Select
                value={rosterEditForm.roster_status}
                onValueChange={(value) =>
                  setRosterEditForm({ ...rosterEditForm, roster_status: value })
                }
              >
                <SelectTrigger id="roster_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Transferred">Transferred</SelectItem>
                  <SelectItem value="Graduated">Graduated</SelectItem>
                  <SelectItem value="Medical Redshirt">Medical Redshirt</SelectItem>
                  <SelectItem value="Left Program">Left Program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="roster_notes">Notes</Label>
              <Textarea
                id="roster_notes"
                value={rosterEditForm.roster_notes}
                onChange={(e) =>
                  setRosterEditForm({ ...rosterEditForm, roster_notes: e.target.value })
                }
                placeholder="Optional notes about roster status..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingRosterEntry(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveRosterEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
