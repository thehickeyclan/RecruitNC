"use client"

import type React from "react"

import { useEffect, useState, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  Moon,
  Sun,
  Loader2,
  Activity as ActivityIcon,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RecruitingFunnelChart } from "@/components/recruiting-funnel-chart"
import { SchoolBrandedHeader } from "@/components/school-branded-header"
import { useSchoolBranding } from "@/hooks/use-school-branding"
import { AuthGuard } from "@/components/auth-guard"
import { createClient } from "@/lib/supabase/client"
import { RecruitingActionsDashboard, RecruitingActionsDashboardRef } from "@/components/recruiting-actions-dashboard"
import { CreateProspectModal } from "@/components/create-prospect-modal"
import { StarRating } from "@/components/star-rating"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { getNhscaResults, getSuper32Results, getNationalTeamResults } from "@/lib/tournament-utils"
import { BirthdayCalendar } from "@/components/birthday-calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  college?: string
  academic_gpa?: number
  academic_sat?: number
  academic_act?: number
  academic_summary?: string
  location?: string
  state?: string
  phone?: string
  contactEmail?: string
  bio?: string
  pipeline_stage?: string
  is_starred?: boolean
  star_count?: number
  star_rating?: number | null
  careerRecord?: string
  birthdate?: string
  nhsca_results?: any[]
  super32_results?: any[]
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
  gi_bill_eligible?: boolean
  birthdate?: string
  has_applied?: boolean
  applied_date?: string | null
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
  coach_name?: string
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

const PIPELINE_STAGES_BASE = [
  { id: "Prospect", label: "Prospect" },
  { id: "Contacted", label: "Contacted" },
  { id: "Recruiting", label: "Recruiting" },
  { id: "Visited", label: "Visited" },
  { id: "Offered", label: "Offered" },
  { id: "Committed", label: "Committed" },
  { id: "Signed", label: "Signed" },
  { id: "Lost", label: "Lost" },
]

const ACTIVITY_OPTIONS = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Official Visit" },
  { value: "prospect_camp", label: "Prospect Camp" },
  { value: "watched_live", label: "Watched Live" },
  { value: "letter", label: "Handwritten Letter" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
] as const

const ACTIVITY_LABELS = ACTIVITY_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const ACTIVITY_EMOJI_MAP: Record<string, string> = {
  call: "📞",
  text: "💬",
  email: "📧",
  visit: "🏛️",
  prospect_camp: "🏕️",
  watched_live: "👀",
  letter: "✍️",
  social_media: "📱",
  other: "📝",
}

const buildInitialBulkActivityForm = () => ({
  actionType: ACTIVITY_OPTIONS[0].value,
  actionDate: new Date().toISOString().split("T")[0],
  description: "",
  outcome: "",
  isScheduled: false,
  followUpDate: "",
})

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "107, 114, 128" // Default gray
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

// Function to get stage color based on school branding (matches funnel chart)
const getStageColor = (stageId: string, schoolPrimaryColor?: string | null): string => {
  const stageIndex = PIPELINE_STAGES_BASE.findIndex(s => s.id === stageId)
  
  // Committed uses high opacity of primary color
  if (stageId === "Committed" && schoolPrimaryColor) {
    const rgb = hexToRgb(schoolPrimaryColor)
    return `rgba(${rgb}, 0.85)`
  }
  
  // Signed uses even higher opacity
  if (stageId === "Signed" && schoolPrimaryColor) {
    const rgb = hexToRgb(schoolPrimaryColor)
    return `rgba(${rgb}, 0.95)`
  }
  
  // Lost uses red
  if (stageId === "Lost") {
    return "#EF4444"
  }
  
  // Other stages use gradient from light to medium based on primary color
  if (schoolPrimaryColor) {
    const rgb = hexToRgb(schoolPrimaryColor)
    const opacity = 0.3 + stageIndex * 0.12 // Matches funnel chart logic
    return `rgba(${rgb}, ${opacity})`
  }
  
  // Fallback colors if no branding (matches funnel chart)
  const fallbackColors = [
    "#c76e7f", // Light pink (Prospect)
    "#a95463", // Lighter maroon (Contacted)
    "#9a4755", // Light maroon (Recruiting)
    "#8f424e", // Mid-tone maroon (Visited)
    "#8b3a47", // Medium maroon (Offered)
    "#7c2d3a", // Dark maroon (Committed)
    "#6d2628", // Darker maroon (Signed)
    "#EF4444", // Red (Lost)
  ]
  return fallbackColors[stageIndex] || "#6B7280"
}

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
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { branding: schoolBranding, isLoading: brandingLoading } = useSchoolBranding(params.schoolId)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isThemeMounted, setIsThemeMounted] = useState(false)
  // Removed redundant school state - using schoolBranding from hook instead

  // Admin viewing as specific coach
  const viewAsCoachId = searchParams?.get("viewAsCoachId") || null
  const viewAsCoachEmail = searchParams?.get("coachEmail") || null

  const isAdmin = profile?.is_admin === true
  const isImpersonatingCoach = Boolean(viewAsCoachId)
  const canLogActivities = !isAdmin || isImpersonatingCoach

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedState, setSelectedState] = useState<string>("all")
  const [selectedRating, setSelectedRating] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"board" | "table">("table")
  const [activePortalView, setActivePortalView] = useState<"dashboard" | "calendar" | "activity">("dashboard")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const dashboardRef = useRef<RecruitingActionsDashboardRef>(null)
  const [selectedAthlete, setSelectedAthlete] = useState<Prospect | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
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
  const [selectedAthleteActivities, setSelectedAthleteActivities] = useState<Activity[]>([])
  const [loggingActivity, setLoggingActivity] = useState<Record<string, boolean>>({})
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(() => new Set())
  const [isBulkActivityOpen, setIsBulkActivityOpen] = useState(false)
  const [isBulkLogging, setIsBulkLogging] = useState(false)
  const [bulkActivityForm, setBulkActivityForm] = useState(() => buildInitialBulkActivityForm())
  const [appliedUpdating, setAppliedUpdating] = useState<Record<string, boolean>>({})
  const [nchsaaResults, setNchsaaResults] = useState<any[]>([])
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
    giBillEligible: false,
  })
  const [isSavingFinancials, setIsSavingFinancials] = useState(false)
  // Use a more descriptive state name if `showActivityDialog` refers to the dialog for adding/editing activities
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [ncRecruits, setNcRecruits] = useState<any[]>([])
  const [loadingNcRecruits, setLoadingNcRecruits] = useState(true)
  const [pipelineHistory, setPipelineHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [editingRosterEntry, setEditingRosterEntry] = useState<any | null>(null)
  const [showCreateProspectModal, setShowCreateProspectModal] = useState(false)
  const [rosterEditForm, setRosterEditForm] = useState({
    roster_status: "Active",
    roster_notes: "",
  })
  const [isRosterHistoryOpen, setIsRosterHistoryOpen] = useState(false)
  const [academicNotes, setAcademicNotes] = useState("")
  const [isSavingAcademicNotes, setIsSavingAcademicNotes] = useState(false)


  // Removed redundant fetchSchool - using useSchoolBranding hook instead

  useEffect(() => {
    setIsThemeMounted(true)
    if (typeof window !== "undefined") {
      const storedTheme = window.localStorage.getItem("portal-theme")
      if (storedTheme === "light") {
        setIsDarkMode(false)
      } else {
        setIsDarkMode(true)
        if (!storedTheme) {
          window.localStorage.setItem("portal-theme", "dark")
        }
      }
    }
  }, [])

  useEffect(() => {
    const isAuthorized = profile?.is_admin || profile?.school_id === params.schoolId
    if (!authLoading && profile && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, profile, params.schoolId, router])

  useEffect(() => {
    setSelectedProspectIds((previous) => {
      if (previous.size === 0) return previous

      const validIds = new Set(prospects.map((prospect) => prospect.id))
      let changed = false
      const next = new Set<string>()

      previous.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id)
        } else {
          changed = true
        }
      })

      return changed ? next : previous
    })
  }, [prospects])

  useEffect(() => {
    if (viewMode === "board") {
      setSelectedProspectIds(new Set())
    }
  }, [viewMode])

  const fetchPipelineHistory = async () => {
    const schoolName = schoolBranding?.name
    
    if (!schoolName || typeof schoolName !== "string" || schoolName.trim().length === 0) {
      console.log("[v0] Skipping pipeline history fetch - school name not available")
      return
    }

    try {
      setLoadingHistory(true)
      console.log("[v0] Fetching pipeline history for school:", schoolName)
      
      // Add cache-busting timestamp to force fresh data
      const timestamp = new Date().getTime()
      const response = await fetch(
        `/api/coaches/pipeline-history?schoolName=${encodeURIComponent(schoolName)}&_t=${timestamp}`,
        { cache: 'no-store' }
      )
      
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

  const handleStarRatingChange = async (athleteId: string, newRating: number) => {
    try {
      const response = await fetch("/api/coaches/star-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          rating: newRating,
          viewAsCoachId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update star rating")
      }

      // Update local state optimistically
      setProspects((prev) =>
        prev.map((p) =>
          p.id === athleteId ? { ...p, star_rating: newRating === 0 ? null : newRating } : p
        )
      )

      toast({
        title: "Rating Updated",
        description: newRating === 0 ? "Rating removed" : `Rated ${newRating} star${newRating > 1 ? 's' : ''}`,
      })
    } catch (error) {
      console.error("Error updating star rating:", error)
      toast({
        title: "Error",
        description: "Failed to update rating. Please try again.",
        variant: "destructive",
      })
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
        
        // CLIENT-SIDE SAFETY FILTER: Exclude 2025 and earlier (only show active recruits)
        const currentYear = new Date().getFullYear()
        const minActiveYear = currentYear + 1
        const filteredRecruits = (data.recruits || []).filter((recruit: any) => {
          const gradYear = typeof recruit.year === 'string' ? parseInt(recruit.year, 10) : recruit.year
          const isActive = gradYear && !isNaN(gradYear) && gradYear >= minActiveYear
          if (!isActive && recruit.year) {
            console.log(`[v0] 🚨 CLIENT FILTER: Excluding ${recruit.name} (class of ${recruit.year}) - not an active recruit`)
          }
          return isActive
        })
        
        console.log(`[v0] Filtered from ${data.recruits?.length || 0} to ${filteredRecruits.length} active recruits (minActiveYear=${minActiveYear})`)
        if (filteredRecruits.length > 0) {
          console.log("[v0] Active recruit names:", filteredRecruits.map((r: any) => `${r.name} (${r.year})`))
          console.log("[v0] Years in filtered results:", [...new Set(filteredRecruits.map((r: any) => r.year))].sort())
        }
        setNcRecruits(filteredRecruits)
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
      
      // Use API endpoint with service role to bypass RLS
      const response = await fetch("/api/coaches/roster-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: editingRosterEntry.id,
          roster_status: rosterEditForm.roster_status,
          roster_notes: rosterEditForm.roster_notes || null,
        }),
      })

      const data = await response.json()
      console.log("[Roster Edit] API response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to update roster status")
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
      
      // Use API endpoint with service role to bypass RLS
      const response = await fetch(`/api/coaches/roster-status?athleteId=${athleteId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      console.log("[Roster Delete] API response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove athlete")
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
    console.log("[v0] View as coach ID:", viewAsCoachId)
    if (profile || !authLoading) {
      // Fetch prospects only if profile is loaded or auth is not loading
      fetchProspects()
      fetchActivities() // Fetch all activities initially to populate overdue list
    }
  }, [params.schoolId, profile, authLoading, viewAsCoachId])

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

      const viewAsParam = viewAsCoachId ? `&viewAsCoachId=${viewAsCoachId}` : ""
      const response = await fetch(`/api/coach-portal/prospects?schoolId=${params.schoolId}${viewAsParam}`, {
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

  const fetchNCHSAAResults = async (athleteName: string, graduationYear: number) => {
    try {
      console.log("[v0] Fetching NCHSAA for:", athleteName, graduationYear)
      const response = await fetch(`/api/nchsaa-results?athleteName=${encodeURIComponent(athleteName)}&graduationYear=${graduationYear}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] NCHSAA results received:", data.results?.length || 0, data.results)
        setNchsaaResults(data.results || [])
      } else {
        console.error("[v0] NCHSAA API error:", response.status)
      }
    } catch (error) {
      console.error("Error fetching NCHSAA results:", error)
      setNchsaaResults([])
    }
  }

  // Fetch NCHSAA results when athlete is selected
  useEffect(() => {
    if (selectedAthlete) {
      console.log("[v0] Selected athlete changed:", selectedAthlete.name, "Location:", selectedAthlete.location)
      if (selectedAthlete.location === "NC") {
        fetchNCHSAAResults(selectedAthlete.name, selectedAthlete.graduationyear)
      } else {
        console.log("[v0] Not NC athlete, skipping NCHSAA fetch")
        setNchsaaResults([])
      }
    }
  }, [selectedAthlete?.id])

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
        const fetchedActivities: Activity[] = (data.activities || []).map((activity: Activity & { prospect?: { name?: string; photourl?: string } }) => ({
          ...activity,
          athlete_id: activity.athlete_id,
          athlete_name: activity.athlete_name || activity.prospect?.name,
          athlete_photo: activity.athlete_photo || activity.prospect?.photourl,
          coach_name: activity.coach_name || "Unknown Coach",
        }))

        if (athleteId) {
          const normalizedForAthlete = fetchedActivities.map((activity) => ({
            ...activity,
            athlete_id: activity.athlete_id || athleteId,
          }))

          setSelectedAthleteActivities(normalizedForAthlete)
          setActivities((previousActivities) => {
            const withoutAthlete = previousActivities.filter((activity) => activity.athlete_id !== athleteId)
            return [...withoutAthlete, ...normalizedForAthlete].sort(
              (a, b) => new Date(b.action_date).getTime() - new Date(a.action_date).getTime(),
            )
          })
        } else {
          const sortedActivities = fetchedActivities.sort(
            (a, b) => new Date(b.action_date).getTime() - new Date(a.action_date).getTime(),
          )
          setActivities(sortedActivities)

          if (selectedAthlete) {
            const matchingActivities = sortedActivities.filter(
              (activity) => activity.athlete_id === selectedAthlete.id,
            )
            setSelectedAthleteActivities(matchingActivities)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching activities:", error)
    }
  }

  useEffect(() => {
    if (!selectedAthlete) {
      setSelectedAthleteActivities([])
    }
  }, [selectedAthlete])

  const handleInlineActivityLog = async (
    athleteId: string,
    actionType: (typeof ACTIVITY_OPTIONS)[number]["value"],
  ) => {
    setLoggingActivity((previous) => ({ ...previous, [athleteId]: true }))

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          actionType,
          ...(viewAsCoachId ? { viewAsCoachId } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to log activity")
      }

      const pipelineStage = data.effects?.pipeline_stage as string | undefined
      if (pipelineStage) {
        setProspects((existing) =>
          existing.map((prospect) =>
            prospect.id === athleteId ? { ...prospect, pipeline_stage: pipelineStage } : prospect,
          ),
        )

        setSelectedAthlete((current) =>
          current && current.id === athleteId ? { ...current, pipeline_stage: pipelineStage } : current,
        )
      }

      toast({
        title: "Activity logged",
        description: `${ACTIVITY_LABELS[actionType]} saved to timeline`,
      })

      await fetchActivities()
    } catch (error) {
      console.error("[v0] Error logging inline activity:", error)
      toast({
        title: "Unable to log activity",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoggingActivity((previous) => {
        const next = { ...previous }
        delete next[athleteId]
        return next
      })
    }
  }

  const resetBulkActivityForm = (persistActionType = true) => {
    setBulkActivityForm((previous) => {
      const baseline = buildInitialBulkActivityForm()
      if (!persistActionType) {
        return baseline
      }
      return { ...baseline, actionType: previous.actionType }
    })
  }

  const clearSelectedProspects = () => setSelectedProspectIds(new Set())

  const handleToggleProspectSelection = (prospectId: string, checked: boolean) => {
    setSelectedProspectIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(prospectId)
      } else {
        next.delete(prospectId)
      }
      return next
    })
  }

  const handleToggleAllVisible = (visibleProspects: Prospect[]) => {
    setSelectedProspectIds((previous) => {
      const next = new Set(previous)
      const visibleIds = visibleProspects.map((prospect) => prospect.id)
      const allSelected = visibleIds.every((id) => next.has(id))

      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }

      return next
    })
  }

  const handleOpenBulkActivityModal = () => {
    if (!canLogActivities) {
      toast.error("Impersonate a coach to log activities.")
      return
    }

    if (selectedProspectIds.size === 0) {
      toast.error("Select at least one athlete to log an activity.")
      return
    }

    resetBulkActivityForm()
    setIsBulkActivityOpen(true)
  }

  const handleBulkActivitySubmit = async () => {
    if (selectedProspectIds.size === 0) {
      toast.error("Select at least one athlete to log an activity.")
      return
    }

    if (!bulkActivityForm.actionDate) {
      toast.error("Pick an activity date.")
      return
    }

    if (bulkActivityForm.isScheduled && !bulkActivityForm.followUpDate) {
      toast.error("Pick a follow-up date.")
      return
    }

    setIsBulkLogging(true)

    try {
      const response = await fetch("/api/coach-portal/activities/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteIds: Array.from(selectedProspectIds),
          actionType: bulkActivityForm.actionType,
          actionDate: bulkActivityForm.actionDate,
          followUpDate:
            bulkActivityForm.isScheduled && bulkActivityForm.followUpDate
              ? bulkActivityForm.followUpDate
              : null,
          description: bulkActivityForm.description,
          outcome: bulkActivityForm.outcome,
          isScheduled: bulkActivityForm.isScheduled,
          ...(viewAsCoachId ? { viewAsCoachId } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to log activities")
      }

      const successCount: number = data.successCount ?? 0
      const failureCount: number = data.failureCount ?? 0
      const results: Array<{
        athleteId: string
        success: boolean
        error?: string
        effects?: { pipeline_stage?: string }
      }> = data.results ?? []

      if (successCount > 0) {
        toast.success(`Logged ${successCount} ${successCount === 1 ? "activity" : "activities"}.`)
      }

      if (failureCount > 0) {
        toast.error(
          `${failureCount} ${failureCount === 1 ? "activity" : "activities"} failed. Please review and try again.`,
        )
      }

      if (results.length > 0) {
        const pipelineUpdates = new Map<string, string>()
        results.forEach((result) => {
          if (result.success && result.effects?.pipeline_stage) {
            pipelineUpdates.set(result.athleteId, result.effects.pipeline_stage)
          }
        })

        if (pipelineUpdates.size > 0) {
          setProspects((existing) =>
            existing.map((prospect) =>
              pipelineUpdates.has(prospect.id)
                ? { ...prospect, pipeline_stage: pipelineUpdates.get(prospect.id) || prospect.pipeline_stage }
                : prospect,
            ),
          )

          setSelectedAthlete((current) =>
            current && pipelineUpdates.has(current.id)
              ? { ...current, pipeline_stage: pipelineUpdates.get(current.id)! }
              : current,
          )
        }
      }

      await fetchActivities()
      await fetchProspects()

      if (failureCount > 0 && data.results) {
        const failedIds = data.results
          .filter((result: any) => !result.success)
          .map((result: any) => result.athleteId)
        setSelectedProspectIds(new Set(failedIds))
      } else {
        clearSelectedProspects()
        setIsBulkActivityOpen(false)
        resetBulkActivityForm()
      }
    } catch (error) {
      console.error("[v0] Error logging bulk activity:", error)
      toast.error(error instanceof Error ? error.message : "Failed to log activities")
    } finally {
      setIsBulkLogging(false)
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

  // Load financial data and academic notes when athlete is selected
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
        giBillEligible: selectedAthlete.gi_bill_eligible || false,
      })
      // Load academic notes from star data
      setAcademicNotes((selectedAthlete as any).academic_notes || "")
    }
  }, [selectedAthlete])

  // Handler for saving academic notes
  const handleSaveAcademicNotes = async () => {
    if (!selectedAthlete) return

    try {
      setIsSavingAcademicNotes(true)

      const response = await fetch(`/api/coaches/starred-athletes/${selectedAthlete.id}/academic-notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academic_notes: academicNotes }),
      })

      if (response.ok) {
        toast({
          title: "Academic notes saved",
          description: "Your academic notes have been saved successfully.",
        })
        // Refresh the selected athlete data
        const updatedResponse = await fetch(`/api/coaches/starred-athletes/${selectedAthlete.id}`)
        if (updatedResponse.ok) {
          const data = await updatedResponse.json()
          setSelectedAthlete(data.athlete)
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to save academic notes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving academic notes:", error)
      toast({
        title: "Error",
        description: "Failed to save academic notes",
        variant: "destructive",
      })
    } finally {
      setIsSavingAcademicNotes(false)
    }
  }

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
          giBillEligible: financialData.giBillEligible,
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

  const lastActivityByAthlete = useMemo(() => {
    const map: Record<string, Activity> = {}

    activities.forEach((activity) => {
      if (!activity.athlete_id) return

      const existing = map[activity.athlete_id]
      if (
        !existing ||
        new Date(activity.action_date).getTime() > new Date(existing.action_date).getTime()
      ) {
        map[activity.athlete_id] = activity
      }
    })

    return map
  }, [activities])

  const getLastActivityForAthlete = (athleteId: string) => lastActivityByAthlete[athleteId] || null

  const getLastContactedDate = (athleteId: string) => {
    const lastActivity = getLastActivityForAthlete(athleteId)
    return lastActivity ? lastActivity.action_date : null
  }

  const formatLastContactDate = (dateString: string | null) => {
    if (!dateString) return "No contact"

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return "No contact"

    const today = new Date()

    const startOfDay = (d: Date) => {
      const copy = new Date(d)
      copy.setHours(0, 0, 0, 0)
      return copy
    }

    const target = startOfDay(date)
    const current = startOfDay(today)

    const diffMs = current.getTime() - target.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      if (diffDays === -1) return "Tomorrow"
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`
    if (diffDays >= 7 && diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getInitials = (value?: string | null) => {
    if (!value) return ""
    const initials = value
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
    return initials.slice(0, 2)
  }

  const formatPhoneNumber = (phone?: string | null) => {
    if (!phone) return ""

    const digits = phone.replace(/\D/g, "")

    if (digits.length === 11 && digits.startsWith("1")) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }

    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }

    if (digits.length === 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    }

    return phone
  }

  const normalizePhoneForTel = (phone?: string | null) => {
    if (!phone) return ""

    const digits = phone.replace(/\D/g, "")
    if (!digits) return phone

    return digits
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
          ...(viewAsCoachId ? { viewAsCoachId } : {}),
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

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!selectedAthlete) return

    const previousValue = selectedAthlete[field as keyof Prospect]
    
    // Optimistic update
    setSelectedAthlete((prev) => {
      if (!prev) return null
      return { ...prev, [field]: value || null }
    })

    try {
      const response = await fetch("/api/coaches/update-athlete-field", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          field,
          value: value || null,
          viewAsCoachId,
        }),
      })

      if (!response.ok) {
        // Revert on error
        setSelectedAthlete((prev) => {
          if (!prev) return null
          return { ...prev, [field]: previousValue }
        })
        const errorData = await response.json()
        toast({
          title: "Update Failed",
          description: errorData.error || "Failed to update field",
          variant: "destructive",
        })
        return
      }

      // Also update in prospects list
      setProspects((prev) =>
        prev.map((p) => (p.id === selectedAthlete.id ? { ...p, [field]: value || null } : p))
      )

      toast({
        title: "Updated",
        description: "Field updated successfully",
      })
    } catch (error) {
      // Revert on error
      setSelectedAthlete((prev) => {
        if (!prev) return null
        return { ...prev, [field]: previousValue }
      })
      toast({
        title: "Update Failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setEditingField(null)
      setEditingValue("")
    }
  }

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field)
    setEditingValue(currentValue?.toString() || "")
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

  const handleAppliedToggle = async (prospectId: string, applied: boolean) => {
    const previousProspects = [...prospects]
    const previousSelectedAthlete = selectedAthlete ? { ...selectedAthlete } : null
    const timestamp = new Date().toISOString()

    setProspects((current) =>
      current.map((prospect) =>
        prospect.id === prospectId
          ? { ...prospect, has_applied: applied, applied_date: applied ? timestamp : null }
          : prospect,
      ),
    )

    if (selectedAthlete?.id === prospectId) {
      setSelectedAthlete({
        ...selectedAthlete,
        has_applied: applied,
        applied_date: applied ? timestamp : null,
      })
    }

    setAppliedUpdating((prev) => ({ ...prev, [prospectId]: true }))

    try {
      const response = await fetch("/api/coach-portal/update-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: prospectId,
          hasApplied: applied,
          schoolId: params.schoolId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update applied status")
      }

      const updatedApplied = data.has_applied ?? applied
      const updatedDate = data.applied_date ?? (applied ? timestamp : null)

      setProspects((current) =>
        current.map((prospect) =>
          prospect.id === prospectId
            ? { ...prospect, has_applied: updatedApplied, applied_date: updatedDate }
            : prospect,
        ),
      )

      if (selectedAthlete?.id === prospectId) {
        setSelectedAthlete({
          ...selectedAthlete,
          has_applied: updatedApplied,
          applied_date: updatedDate,
        })
      }
    } catch (error) {
      console.error("[v0] Error updating applied status:", error)
      setProspects(previousProspects)
      if (previousSelectedAthlete) {
        setSelectedAthlete(previousSelectedAthlete)
      }
      toast({
        title: "Update Failed",
        description: "Unable to update applied status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAppliedUpdating((prev) => {
        const next = { ...prev }
        delete next[prospectId]
        return next
      })
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

  // Helper function to check if prospect is from North Carolina
  const isNCProspect = (prospect: any): boolean => {
    const state = (prospect.state || "").trim().toLowerCase()
    if (state === "nc" || state === "north carolina") return true
    
    const location = (prospect.location || "").trim().toLowerCase()
    if (location) {
      if (/\bnorth carolina\b/.test(location) || /\bnc\b/.test(location.replace(/[.,]/g, " "))) {
        return true
      }
      // Check for non-NC states
      const nonNcStates = ["sc", "south carolina", "ga", "georgia", "va", "virginia", "tn", "tennessee", 
                          "fl", "florida", "oh", "ohio", "pa", "pennsylvania", "ny", "new york", 
                          "tx", "texas", "ca", "california", "al", "alabama", "nj", "new jersey",
                          "wv", "west virginia"]
      if (nonNcStates.some((stateToken) => location.includes(stateToken))) {
        return false
      }
    }
    
    // Default to true if we can't determine (assume NC for existing data)
    return true
  }

  // Helper function to check if ranking should be displayed
  const shouldShowRanking = (prospect: any): boolean => {
    // Only show rankings for NC athletes
    if (!isNCProspect(prospect)) return false
    // Only show rankings 1-30
    if (!prospect.prospect_ranking || prospect.prospect_ranking > 30) return false
    return true
  }

  const filteredProspects = prospects.filter((prospect) => {
    const matchesSearch =
      !searchTerm ||
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.highschool?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.location?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesYear = selectedYear === "all" || prospect.graduationyear?.toString() === selectedYear

    const matchesGender =
      selectedGender === "all" ||
      (selectedGender === "male" && prospect.gender?.toLowerCase() === "male") ||
      (selectedGender === "female" && prospect.gender?.toLowerCase() === "female")

    const matchesState = 
      selectedState === "all" || 
      (prospect.location || "NC") === selectedState

    const matchesRating = 
      selectedRating === "all" || 
      (selectedRating === "unrated" && !prospect.star_rating) ||
      (prospect.star_rating?.toString() === selectedRating)

    return matchesSearch && matchesYear && matchesGender && matchesState && matchesRating
  })

  console.log("[v0] Filtered prospects:", {
    total: prospects.length,
    filtered: filteredProspects.length,
    searchTerm,
    selectedYear,
    selectedGender,
    selectedState,
    selectedRating,
  })

  // Sorting logic for table view
  const sortedProspects = [...filteredProspects].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case "name":
        aValue = a.name?.toLowerCase() || ""
        bValue = b.name?.toLowerCase() || ""
        break
      case "year":
        aValue = a.graduationyear || 0
        bValue = b.graduationyear || 0
        break
      case "weight":
        aValue = parseInt(a.weightclass) || 0
        bValue = parseInt(b.weightclass) || 0
        break
      case "state":
        aValue = a.location?.toLowerCase() || ""
        bValue = b.location?.toLowerCase() || ""
        break
      case "stage":
        aValue = a.pipeline_stage?.toLowerCase() || ""
        bValue = b.pipeline_stage?.toLowerCase() || ""
        break
      case "gpa":
        aValue = a.academic_gpa || 0
        bValue = b.academic_gpa || 0
        break
      case "ranking":
        aValue = a.prospect_ranking || 9999
        bValue = b.prospect_ranking || 9999
        break
      case "rating":
        aValue = a.star_rating || 0
        bValue = b.star_rating || 0
        break
      case "lastActivity": {
        const lastA = getLastActivityForAthlete(a.id)
        const lastB = getLastActivityForAthlete(b.id)
        aValue = lastA ? new Date(lastA.action_date).getTime() : 0
        bValue = lastB ? new Date(lastB.action_date).getTime() : 0
        break
      }
      default:
        return 0
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const selectedProspectList = useMemo(
    () => prospects.filter((prospect) => selectedProspectIds.has(prospect.id)),
    [prospects, selectedProspectIds],
  )
  const bulkSelectedCount = selectedProspectIds.size
  const selectedVisibleCount = useMemo(
    () =>
      sortedProspects.reduce(
        (count, prospect) => (selectedProspectIds.has(prospect.id) ? count + 1 : count),
        0,
      ),
    [sortedProspects, selectedProspectIds],
  )
  const allVisibleSelected = sortedProspects.length > 0 && selectedVisibleCount === sortedProspects.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected
  const headerCheckboxState: boolean | "indeterminate" = allVisibleSelected
    ? true
    : someVisibleSelected
      ? "indeterminate"
      : false
  const previewSelectedProspects = useMemo(
    () => selectedProspectList.slice(0, 6),
    [selectedProspectList],
  )
  const remainingSelectedCount = Math.max(selectedProspectList.length - previewSelectedProspects.length, 0)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const graduationYears = [...new Set(prospects.map((p) => p.graduationyear).filter(Boolean))].sort((a, b) => a - b)
  const states = [...new Set(prospects.map((p) => p.location || "NC").filter(Boolean))].sort()

  const normalizeStage = (stage: string | null | undefined): string => {
    const normalized = (stage || "Prospect").trim()
    
    // Map legacy/invalid stages to valid ones
    const stageLower = normalized.toLowerCase()
    if (stageLower === "college athlete" || stageLower === "current college athlete") {
      return "Signed"
    }
    if (stageLower === "evaluating" || stageLower === "reached out") {
      return "Contacted"
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

  // Check if athlete is committed to a different school
  const isCommittedElsewhere = (prospect: Prospect) => {
    if (!prospect.college || !schoolBranding?.name) return false
    
    const athleteCollege = prospect.college.trim().toLowerCase()
    const thisSchool = schoolBranding.name.trim().toLowerCase()
    
    // Check if committed/signed
    const isCommitted = prospect.recruiting_status === "Committed" || 
                        prospect.recruiting_status === "Signed" ||
                        prospect.recruiting_status === "College Athlete"
    
    // Return true if committed and school doesn't match
    return isCommitted && athleteCollege !== thisSchool && !thisSchool.includes(athleteCollege) && !athleteCollege.includes(thisSchool)
  }

  const stageCounts = PIPELINE_STAGES_BASE.reduce(
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

  const isDashboardView = activePortalView === "dashboard"

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        window.localStorage.setItem("portal-theme", next ? "dark" : "light")
      }
      return next
    })
  }

  if (authLoading || isLoading || brandingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading portal...</p>
        </div>
      </div>
    )
  }

  // Show loading state while school branding is being fetched
  if (brandingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors">
        <div className="text-center">
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if school branding couldn't be loaded
  if (!schoolBranding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors">
        <div className="text-center">
          <p className="text-foreground">School not found</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SchoolBrandedHeader
        schoolId={params.schoolId}
        schoolName={schoolBranding?.name || ""}
        subtitle={`${filteredProspects.length} Active Prospects`}
      />

      <div className="container mx-auto px-4 py-3 flex justify-end">
        {isThemeMounted && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleThemeToggle}
            className="flex items-center gap-2 rounded-full bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline text-xs font-semibold tracking-wide">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          </Button>
        )}
      </div>

      <div className="container mx-auto px-4 pb-4" data-recruiting-dashboard>
        <RecruitingActionsDashboard
          ref={dashboardRef}
          schoolId={params.schoolId}
          athletes={prospects.map((prospect) => ({ id: prospect.id, name: prospect.name }))}
          prospects={(() => {
            const prospectsWithBirthdays = prospects.map((prospect) => ({
              id: prospect.id,
              name: prospect.name,
              birthdate: prospect.birthdate,
              photourl: prospect.photourl,
              graduationyear: prospect.graduationyear,
              weightclass: prospect.weightclass,
              pipeline_stage: prospect.pipeline_stage,
              star_rating: prospect.star_rating,
            }))
            console.log("[v0] Portal - Passing prospects to dashboard:", prospectsWithBirthdays.length)
            console.log(
              "[v0] Portal - Prospects with birthdates:",
              prospectsWithBirthdays
                .filter((prospect) => prospect.birthdate)
                .map((prospect) => ({ name: prospect.name, birthdate: prospect.birthdate })),
            )
            return prospectsWithBirthdays
          })()}
          onViewChange={(view) => setActivePortalView(view)}
          brandColor={schoolBranding?.primary_color || "#0b1728"}
        />
      </div>

      {profile?.is_admin && (
        <div
          className={
            viewAsCoachId
              ? "bg-orange-100 border-b border-orange-200 dark:bg-orange-500/20 dark:border-orange-600/40"
              : "bg-blue-50 border-b border-blue-100 dark:bg-blue-500/10 dark:border-blue-400/30"
          }
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            {viewAsCoachId ? (
              <>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-600 text-white text-sm px-3 py-1">
                    👁️ VIEWING AS COACH
                  </Badge>
                  <span className="text-sm font-medium text-orange-900">
                    {viewAsCoachEmail || "Coach View"}
                  </span>
                  <span className="text-xs text-orange-700">
                    ({filteredProspects.length} athletes in their pipeline)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/admin/schools")}
                  className="border-orange-300 text-orange-700 hover:bg-orange-200"
                >
                  Exit Coach View
                </Button>
              </>
            ) : (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                ADMIN PREVIEW MODE
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Mobile-only Quick Actions Bar */}
      <div className="md:hidden sticky top-0 z-30 bg-background border-b-2 border-border shadow-sm transition-colors">
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
            <div className="flex-1 flex gap-2">
              <Button
                onClick={() => {
                  console.log("[v0] Browse NC Rankings button clicked")
                  window.location.href = "https://app.ncwrestlingunited.com/public-rankings"
                }}
                className="flex-1 h-12 px-3 rounded-lg font-semibold bg-[#BC0B03] text-white shadow-sm hover:shadow-md hover:bg-[#9a0902] hover:-translate-y-0.5 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Search className="h-4 w-4 mr-1" />
                Rankings
              </Button>
              <Button
                onClick={() => setShowCreateProspectModal(true)}
                className="flex-1 h-12 px-3 rounded-lg font-semibold bg-[#BC0B03] text-white shadow-sm hover:shadow-md hover:bg-[#9a0902] hover:-translate-y-0.5 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isDashboardView &&
        activities.filter((a) => {
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
                    <div key={activity.id} className="bg-card p-3 rounded-lg border border-red-200 dark:border-red-400/50">
                      <div className="flex items-start gap-3">
                        <img
                          src={activity.athlete_photo || "/placeholder.svg?height=40&width=40"}
                          alt={activity.athlete_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{activity.athlete_name}</p>
                          <p className="text-xs text-muted-foreground">
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

      {isDashboardView && (
        <div className="container mx-auto px-4 py-6">
          <RecruitingFunnelChart stageCounts={stageCounts} schoolBranding={schoolBranding} />
        </div>
      )}

      {isDashboardView && (
        <div className="container mx-auto px-4 pb-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* Total Pipeline - Primary metric with school branding */}
          <div
            className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-card dark:bg-slate-900/70 rounded-xl border-2 dark:border-slate-700 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            style={{
              borderColor: schoolBranding?.primary_color || "#3B82F6", // Use schoolBranding
            }}
          >
            <Users
              className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0"
              style={{ color: schoolBranding?.primary_color || "#3B82F6" }} // Use schoolBranding
            />
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.total}</div>
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Pipeline
              </div>
            </div>
          </div>

          {/* Lost to Others - Negative metric */}
          <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-red-50 dark:bg-red-900/40 rounded-xl border-2 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-500 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
            <Target className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0 text-red-600 dark:text-red-300" />
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-200">{stats.lost}</div>
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground dark:text-red-100/70 uppercase tracking-wide">
                Lost to Others
              </div>
            </div>
          </div>

          {/* Offers Out - Informational */}
          <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
            <Target className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0 text-blue-600 dark:text-blue-300" />
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-200">{stats.offersOut}</div>
              <div className="text-[10px] md:text-xs font-semibold text-muted-foreground dark:text-blue-100/70 uppercase tracking-wide">
                Offers Out
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* North Carolina Recruits Section */}
      {isDashboardView && (
        <div className="container mx-auto px-4 pt-4 pb-6">
        <Card className="border border-border shadow-sm bg-card transition-colors">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-foreground">Committed Recruits</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              North Carolina athletes committed or signed to {schoolBranding?.name || "this school"}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {loadingNcRecruits ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-muted-foreground/70">Loading recruits...</div>
              </div>
            ) : ncRecruits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No committed/signed recruits found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-muted">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Year</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Weight</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">High School</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">College</th>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {ncRecruits.map((recruit) => (
                      <tr
                        key={recruit.id}
                        className="border-b transition-colors hover:bg-muted/60 dark:hover:bg-muted/40 data-[state=selected]:bg-muted"
                      >
                        <td className="p-4 align-middle font-medium">{recruit.year || "-"}</td>
                        <td className="p-4 align-middle font-medium">{recruit.name || "-"}</td>
                        <td className="p-4 align-middle">{recruit.weight ? `${recruit.weight}lbs` : "-"}</td>
                        <td className="p-4 align-middle">{recruit.highschool || "-"}</td>
                        <td className="p-4 align-middle">{recruit.college || "-"}</td>
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
      )}

      {isDashboardView && (
        <>
      <div className="container mx-auto px-4 pb-5">
        <div className="bg-card rounded-xl shadow-sm border border-border p-3 md:p-4 transition-colors">
          <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
            <div className="relative flex-1 min-w-full md:min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-[18px] w-[18px]" />
              <Input
                placeholder="Search athletes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-border focus:border-primary bg-background text-foreground placeholder:text-muted-foreground h-11 rounded-lg transition-colors"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="flex-1 md:w-[150px] border-2 border-border hover:border-primary/40 bg-background text-foreground h-11 rounded-lg font-medium touch-manipulation">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border text-foreground">
                  <SelectItem value="all">All Years</SelectItem>
                  {graduationYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Class of {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="flex-1 md:w-[150px] border-2 border-border hover:border-primary/40 bg-background text-foreground h-11 rounded-lg font-medium touch-manipulation">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border text-foreground">
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Men's</SelectItem>
                  <SelectItem value="female">Women's</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="flex-1 md:w-[140px] border-2 border-border hover:border-primary/40 bg-background text-foreground h-11 rounded-lg font-medium touch-manipulation">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border text-foreground">
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger className="flex-1 md:w-[140px] border-2 border-border hover:border-primary/40 bg-background text-foreground h-11 rounded-lg font-medium touch-manipulation">
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border text-foreground">
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <span className="ml-1 text-xs text-muted-foreground">Dream Recruit</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <span className="ml-1 text-xs text-muted-foreground">Excellent Fit</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <span className="ml-1 text-xs text-muted-foreground">Solid Prospect</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <span className="ml-1 text-xs text-muted-foreground">Backup Option</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <span className="ml-1 text-xs text-muted-foreground">Low Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unrated">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <Star className="h-4 w-4 fill-none text-muted-foreground/40" />
                      <span className="ml-1 text-xs text-muted-foreground">Not Rated</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 border border-border rounded-lg p-1 bg-background dark:bg-slate-900/70 w-full md:w-auto transition-colors">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("board")}
                  className={`flex-1 md:flex-none h-11 md:h-9 px-3 touch-manipulation transition-colors ${viewMode === "board" ? "bg-muted" : ""}`}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <span className="text-sm">Board</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`flex-1 md:flex-none h-11 md:h-9 px-3 touch-manipulation transition-colors ${viewMode === "table" ? "bg-muted" : ""}`}
                >
                  <Table className="h-4 w-4 mr-2" />
                  <span className="text-sm">Table</span>
                </Button>
              </div>
            </div>

            <div className="hidden md:flex gap-3">
              <Button
                onClick={() => {
                  console.log("[v0] Browse NC Rankings button clicked")
                  window.location.href = "https://app.ncwrestlingunited.com/public-rankings"
                }}
                className="h-11 px-5 rounded-lg font-semibold bg-[#BC0B03] text-white shadow-sm hover:shadow-md hover:bg-[#9a0902] hover:-translate-y-0.5 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Search className="h-[18px] w-[18px] mr-2" />
                Browse NC Rankings
              </Button>
              <Button
                onClick={() => setShowCreateProspectModal(true)}
                className="h-11 px-5 rounded-lg font-semibold bg-[#BC0B03] text-white shadow-sm hover:shadow-md hover:bg-[#9a0902] hover:-translate-y-0.5 active:scale-[0.98] transition-all touch-manipulation"
              >
                <Plus className="h-[18px] w-[18px] mr-2" />
                Create New Prospect
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {viewMode === "board" ? (
        <div className="flex flex-col md:flex-row md:gap-4 md:overflow-x-auto md:pb-4 space-y-4 md:space-y-0">
          {PIPELINE_STAGES_BASE.map((stage) => {
            const stageProspects = getProspectsByStage(stage.id)
            return (
              <div
                key={stage.id}
                className="md:flex-shrink-0 md:w-80"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="bg-card rounded-xl border border-border flex flex-col transition-all hover:border-primary/40 dark:hover:border-primary/60">
                  <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border/60 dark:border-border/40">
                    <h3 className="text-xs md:text-sm font-bold text-foreground uppercase tracking-wide">
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
                        <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-1">No athletes yet</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground/70">
                          Drag athletes here or add new prospects
                        </div>
                      </div>
                    ) : (
                      stageProspects.map((prospect) => {
                        const committedElsewhere = isCommittedElsewhere(prospect)
                        
                        return (
                        <Card
                          key={prospect.id}
                          draggable
                          onDragStart={() => handleDragStart(prospect)}
                          onClick={() => {
                            const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
                            router.push(url)
                          }}
                          className={`border hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer transition-all rounded-lg touch-manipulation ${
                            committedElsewhere 
                              ? 'bg-muted border-border opacity-80 dark:bg-slate-800 dark:border-slate-700' 
                              : 'bg-card border-border hover:border-primary/40 active:border-primary/60 dark:hover:border-primary/60'
                          }`}
                        >
                          <CardContent className="p-3 md:p-4">
                            {/* Committed Elsewhere Badge */}
                            {committedElsewhere && (
                              <div className="mb-2 bg-gray-700 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 dark:bg-slate-700">
                                <span>⚠️ Committed to {prospect.college}</span>
                              </div>
                            )}
                            
                            <div className="flex gap-3 mb-3 relative">
                              <img
                                src={prospect.photourl || "/placeholder.svg?height=56&width=56&query=wrestler"}
                                alt={prospect.name}
                                className={`w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-border flex-shrink-0 ${
                                  committedElsewhere ? 'grayscale' : ''
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-sm md:text-base truncate mb-1 ${committedElsewhere ? 'text-muted-foreground' : 'text-foreground'}`}>
                                  {prospect.name}
                                </h4>
                                <p className="text-xs md:text-sm text-muted-foreground font-semibold mb-1">
                                  {prospect.graduationyear} • {prospect.weightclass}lbs
                                </p>
                                <p className="text-[10px] md:text-xs text-muted-foreground/80 truncate">{prospect.highschool}</p>
                                {prospect.phone && (
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground/70 flex-shrink-0" />
                                    <a
                                      href={`tel:${normalizePhoneForTel(prospect.phone)}`}
                                      className="hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {formatPhoneNumber(prospect.phone)}
                                    </a>
                                  </div>
                                )}
                              </div>
                              {shouldShowRanking(prospect) && !committedElsewhere && (
                                <div
                                  className="absolute top-0 right-0 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-xs md:text-sm font-bold text-white"
                                  style={{ backgroundColor: schoolBranding?.primary_color || "#3B82F6" }}
                                >
                                  #{prospect.prospect_ranking}
                                </div>
                              )}
                            </div>

                            {prospect.academic_gpa && (
                              <div className="flex gap-2 mb-3">
                                <div className="flex items-center gap-1.5 bg-muted px-2 md:px-3 py-1.5 md:py-2 rounded-md">
                                  <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                                  <span className="text-xs md:text-sm font-bold text-foreground">
                                    {prospect.academic_gpa.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-border/60 dark:border-border/40">
                              <div onClick={(e) => e.stopPropagation()}>
                                <StarRating
                                  rating={prospect.star_rating ?? null}
                                  onRatingChange={(rating) => handleStarRatingChange(prospect.id, rating)}
                                  size="sm"
                                />
                              </div>
                              <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                                {formatLastContactDate(getLastContactedDate(prospect.id))}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-colors">
            {bulkSelectedCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-blue-50/70 px-4 py-3 text-sm dark:bg-slate-800/70">
                <div className="font-medium text-foreground">
                  {bulkSelectedCount} athlete{bulkSelectedCount === 1 ? "" : "s"} selected
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelectedProspects}
                    className="rounded-full"
                    disabled={isBulkLogging}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full bg-[#0b1728] text-white hover:bg-[#13294B]"
                    onClick={handleOpenBulkActivityModal}
                    disabled={!canLogActivities || isBulkLogging}
                  >
                    {isBulkLogging ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging...
                      </>
                    ) : !canLogActivities ? (
                      "Admin Preview"
                    ) : (
                      <>
                        <ActivityIcon className="mr-2 h-4 w-4" />
                        Log Activity
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="md:hidden text-xs text-muted-foreground px-4 py-2 bg-muted border-b border-border/60">
                ← Swipe to see more columns →
              </div>
              <table className="w-full caption-bottom text-sm min-w-[900px]">
                <thead className="[&_tr]:border-b border-border/60 bg-muted">
                  <tr className="border-b border-border/60 transition-colors">
                    <th className="h-12 w-12 px-4 align-middle text-left font-semibold text-foreground">
                      <Checkbox
                        checked={headerCheckboxState}
                        onCheckedChange={() => handleToggleAllVisible(sortedProspects)}
                        aria-label="Select all prospects"
                        disabled={sortedProspects.length === 0}
                      />
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortColumn === "name" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("year")}
                    >
                      <div className="flex items-center gap-1">
                        Year
                        {sortColumn === "year" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("weight")}
                    >
                      <div className="flex items-center gap-1">
                        Weight
                        {sortColumn === "weight" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("state")}
                    >
                      <div className="flex items-center gap-1">
                        State
                        {sortColumn === "state" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("stage")}
                    >
                      <div className="flex items-center gap-1">
                        Stage
                        {sortColumn === "stage" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Applied</th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("rating")}
                    >
                      <div className="flex items-center gap-1">
                        Rating
                        {sortColumn === "rating" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("gpa")}
                    >
                      <div className="flex items-center gap-1">
                        GPA
                        {sortColumn === "gpa" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("ranking")}
                    >
                      <div className="flex items-center gap-1">
                        Ranking
                        {sortColumn === "ranking" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                      onClick={() => handleSort("lastActivity")}
                    >
                      <div className="flex items-center gap-1">
                        Last Activity
                        {sortColumn === "lastActivity" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {sortedProspects.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-muted-foreground">
                        No prospects found
                      </td>
                    </tr>
                  ) : (
                    sortedProspects.map((prospect) => {
                      const stage =
                        PIPELINE_STAGES_BASE.find((s) => s.id === prospect.pipeline_stage) ||
                        PIPELINE_STAGES_BASE[0]
                      const stageColor = getStageColor(stage.id, schoolBranding?.primary_color)
                      const lastActivity = getLastActivityForAthlete(prospect.id)
                      const lastActivityLabel = lastActivity
                        ? ACTIVITY_LABELS[lastActivity.action_type] || lastActivity.action_type
                        : null
                      const isLoggingActivity = Boolean(loggingActivity[prospect.id])
                      return (
                        <tr
                          key={prospect.id}
                          className="border-b border-border/60 transition-colors hover:bg-muted/60 dark:hover:bg-muted/40 active:bg-muted/80 group"
                        >
                          <td
                            className="p-4 align-middle"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedProspectIds.has(prospect.id)}
                              onCheckedChange={(checked) =>
                                handleToggleProspectSelection(prospect.id, checked === true)
                              }
                              aria-label={`Select ${prospect.name}`}
                            />
                          </td>
                          <td
                            className="p-4 align-middle cursor-pointer"
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${
                                viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""
                              }`
                              router.push(url)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {prospect.photourl ? (
                                <img
                                  src={prospect.photourl}
                                  alt={prospect.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-border"
                                />
                              ) : (
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-sm font-semibold uppercase text-white"
                                  style={{ backgroundColor: stageColor || "#334155" }}
                                >
                                  {getInitials(prospect.name)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate block">{prospect.name}</span>
                                {prospect.phone && (
                                  <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                                    {formatPhoneNumber(prospect.phone)}
                                  </span>
                                )}
                              </div>
                              <div className="ml-2 flex items-center gap-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                {prospect.phone && (
                                  <a
                                    href={`tel:${normalizePhoneForTel(prospect.phone)}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded-full border border-border/60 bg-muted/40 p-2 hover:bg-muted hover:text-foreground dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                    aria-label={`Call ${prospect.name}`}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                {prospect.contactEmail && (
                                  <a
                                    href={`mailto:${prospect.contactEmail}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded-full border border-border/60 bg-muted/40 p-2 hover:bg-muted hover:text-foreground dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                    aria-label={`Email ${prospect.name}`}
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td 
                            className="p-4 align-middle text-muted-foreground cursor-pointer"
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
                              router.push(url)
                            }}
                          >
                            {prospect.graduationyear}
                          </td>
                          <td 
                            className="p-4 align-middle text-muted-foreground cursor-pointer"
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
                              router.push(url)
                            }}
                          >
                            {prospect.weightclass}lbs
                          </td>
                          <td 
                            className="p-4 align-middle text-muted-foreground cursor-pointer"
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
                              router.push(url)
                            }}
                          >
                            {prospect.location || "NC"}
                          </td>
                          <td 
                            className="p-4 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                          <Select
                            value={prospect.pipeline_stage || "Prospect"}
                            onValueChange={(value) => handleStageChange(prospect.id, value)}
                          >
                            <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0">
                              <Badge
                                className="text-xs cursor-pointer hover:opacity-90 transition-opacity"
                                style={{
                                  backgroundColor: stageColor,
                                  color: "white",
                                }}
                              >
                                {stage.label}
                                <ChevronDown className="ml-1 h-3 w-3 inline" />
                              </Badge>
                            </SelectTrigger>
                            <SelectContent className="min-w-[180px] rounded-xl border border-border bg-card text-foreground shadow-lg dark:bg-slate-900 dark:text-slate-100">
                              {PIPELINE_STAGES_BASE.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: getStageColor(s.id, schoolBranding?.primary_color) }}
                                    />
                                    <span>{s.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          </td>
                          <td
                            className="p-4 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={prospect.has_applied ?? false}
                                disabled={appliedUpdating[prospect.id] || !canLogActivities}
                                onCheckedChange={(checked) =>
                                  handleAppliedToggle(prospect.id, Boolean(checked))
                                }
                              />
                              {prospect.applied_date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(prospect.applied_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td 
                            className="p-4 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <StarRating
                              rating={prospect.star_rating ?? null}
                              onRatingChange={(rating) => handleStarRatingChange(prospect.id, rating)}
                              size="sm"
                            />
                          </td>
                          <td 
                            className="p-4 align-middle text-muted-foreground cursor-pointer"
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
                              router.push(url)
                            }}
                          >
                            {prospect.academic_gpa ? prospect.academic_gpa.toFixed(1) : "-"}
                          </td>
                          <td 
                            className="p-4 align-middle text-muted-foreground cursor-pointer"
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ''}`
                              router.push(url)
                            }}
                          >
                            {shouldShowRanking(prospect) ? `#${prospect.prospect_ranking}` : "-"}
                          </td>
                          <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                {lastActivity ? (
                                  <div className="flex items-center gap-2 text-sm text-foreground">
                                    <span className="font-medium">
                                      {new Date(lastActivity.action_date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                    <span className="text-lg" aria-label={lastActivityLabel ?? "Activity"}>
                                      {ACTIVITY_EMOJI_MAP[lastActivity.action_type] ?? ACTIVITY_EMOJI_MAP.other}
                                    </span>
                                    {lastActivity.coach_name && (
                                      <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground dark:bg-slate-800 dark:text-slate-200">
                                        {getInitials(lastActivity.coach_name)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No activity yet</span>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isLoggingActivity || !canLogActivities}
                                    className="h-8 w-8 rounded-full border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-slate-800 dark:text-slate-200"
                                    aria-label="Log activity"
                                  >
                                    {isLoggingActivity ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <span className="text-lg leading-none">+</span>
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-[220px] rounded-xl border border-border bg-card text-foreground shadow-lg dark:bg-slate-900 dark:text-slate-100"
                                >
                                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground dark:text-slate-300">
                                    {canLogActivities ? "Log Activity" : "Impersonate a coach to log"}
                                  </DropdownMenuLabel>
                                  {ACTIVITY_OPTIONS.map((option) => (
                                    <DropdownMenuItem
                                      key={option.value}
                                      disabled={isLoggingActivity || !canLogActivities}
                                      onSelect={() => handleInlineActivityLog(prospect.id, option.value)}
                                      className="text-sm text-foreground dark:text-slate-100 dark:focus:bg-slate-800 focus:bg-muted"
                                    >
                                      <span className="mr-2 text-lg">
                                        {ACTIVITY_EMOJI_MAP[option.value] ?? ACTIVITY_EMOJI_MAP.other}
                                      </span>
                                      {option.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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

        </>
      )}

      {/* NC Roster History Section */}
      {isDashboardView && (
      <div className="container mx-auto px-4 pt-6 pb-10">
        <Collapsible open={isRosterHistoryOpen} onOpenChange={setIsRosterHistoryOpen}>
          <Card className="border border-border shadow-sm bg-card transition-colors">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">NC Roster History</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      North Carolina athletes who were recruited and are now enrolled at {schoolBranding?.name || "this school"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-6 w-6 text-muted-foreground transition-transform ${isRosterHistoryOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-6">
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-muted-foreground/70">Loading roster history...</div>
                  </div>
                ) : pipelineHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No historical NC athletes found. Athletes with "College Athlete" status will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b bg-muted">
                        <tr className="border-b transition-colors">
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Class Year</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Name</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Weight</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">High School</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Current Status</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Roster Status</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Years on Team</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {pipelineHistory.map((athlete) => (
                          <tr
                            key={athlete.id}
                            className="border-b transition-colors hover:bg-muted/60 dark:hover:bg-muted/40 data-[state=selected]:bg-muted"
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
                                    : "bg-muted text-muted-foreground border-border"
                                }
                              >
                                {athlete.roster_status || "Active"}
                              </Badge>
                            </td>
                            <td className="p-4 align-middle text-muted-foreground">{athlete.years_on_team || "Current"}</td>
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
      )}

      <Dialog
        open={isBulkActivityOpen}
        onOpenChange={(open) => {
          if (isBulkLogging && !open) return
          setIsBulkActivityOpen(open)
          if (!open) {
            resetBulkActivityForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-background text-foreground dark:bg-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>
              Log Activity for {bulkSelectedCount} {bulkSelectedCount === 1 ? "Athlete" : "Athletes"}
            </DialogTitle>
            <DialogDescription>
              Bulk logging will add this activity to each selected athlete and update timelines automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProspectList.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Selected Athletes
                </p>
                <div className="flex flex-wrap gap-2">
                  {previewSelectedProspects.map((prospect) => (
                  <Badge
                      key={prospect.id}
                    variant="secondary"
                    className="bg-background text-foreground border border-border dark:bg-slate-800 dark:text-slate-100"
                    >
                      {prospect.name}
                    </Badge>
                  ))}
                </div>
                {remainingSelectedCount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">+ {remainingSelectedCount} more</p>
                )}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bulk-activity-type">Activity Type</Label>
                <Select
                  value={bulkActivityForm.actionType}
                  onValueChange={(value) =>
                    setBulkActivityForm((previous) => ({
                      ...previous,
                      actionType: value,
                    }))
                  }
                >
                  <SelectTrigger id="bulk-activity-type" className="bg-background dark:bg-slate-950">
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900">
                    {ACTIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-activity-date">Activity Date</Label>
                <Input
                  id="bulk-activity-date"
                  type="date"
                  value={bulkActivityForm.actionDate}
                  onChange={(event) =>
                    setBulkActivityForm((previous) => ({
                      ...previous,
                      actionDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-activity-description">Description (optional)</Label>
              <Textarea
                id="bulk-activity-description"
                rows={3}
                value={bulkActivityForm.description}
                onChange={(event) =>
                  setBulkActivityForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="Add context for this touchpoint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-activity-outcome">Outcome (optional)</Label>
              <Input
                id="bulk-activity-outcome"
                value={bulkActivityForm.outcome}
                onChange={(event) =>
                  setBulkActivityForm((previous) => ({
                    ...previous,
                    outcome: event.target.value,
                  }))
                }
                placeholder="e.g., Scheduled next call"
              />
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bulk-activity-follow-up"
                  checked={bulkActivityForm.isScheduled}
                  onCheckedChange={(checked) =>
                    setBulkActivityForm((previous) => ({
                      ...previous,
                      isScheduled: checked === true,
                      followUpDate: checked === true ? previous.followUpDate : "",
                    }))
                  }
                />
                <Label htmlFor="bulk-activity-follow-up" className="text-sm font-medium">
                  Schedule follow-up
                </Label>
              </div>
              {bulkActivityForm.isScheduled && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="bulk-activity-follow-up-date" className="text-sm">
                    Follow-up Date
                  </Label>
                  <Input
                    id="bulk-activity-follow-up-date"
                    type="date"
                    value={bulkActivityForm.followUpDate}
                    onChange={(event) =>
                      setBulkActivityForm((previous) => ({
                        ...previous,
                        followUpDate: event.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isBulkLogging) return
                setIsBulkActivityOpen(false)
                resetBulkActivityForm()
              }}
              disabled={isBulkLogging}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkActivitySubmit}
              disabled={isBulkLogging}
              className="bg-[#0b1728] text-white hover:bg-[#13294B]"
            >
              {isBulkLogging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Activities"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAthlete} onOpenChange={() => setSelectedAthlete(null)}>
        <DialogContent className="max-w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] p-0 bg-background border-0 md:border border-border text-foreground md:rounded-lg flex flex-col [&>button]:hidden transition-colors">
          {selectedAthlete && (
            <>
              <DialogHeader className="pb-4 p-4 md:p-6 sticky top-0 bg-background z-10 border-b border-border relative">
                {/* Close button - prominent on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-20 h-10 w-10 md:h-8 md:w-8 rounded-full bg-card shadow-lg border border-border hover:bg-muted transition-all md:right-4 md:top-4 touch-manipulation"
                  onClick={() => setSelectedAthlete(null)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
                </Button>
                <div className="flex items-start gap-4 pr-12 md:pr-0">
                  <img
                    src={selectedAthlete.photourl || "/placeholder.svg?height=80&width=80&query=wrestler"}
                    alt={selectedAthlete.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl md:text-2xl text-foreground mb-1">{selectedAthlete.name}</DialogTitle>
                    <DialogDescription className="text-sm md:text-base text-muted-foreground mb-2">
                      {selectedAthlete.highschool} • {selectedAthlete.wrestlingClub}
                    </DialogDescription>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-600 text-xs md:text-sm">
                        Class of {selectedAthlete.graduationyear}
                      </Badge>
                      <Badge className="bg-purple-600 text-xs md:text-sm">{selectedAthlete.weightclass}lbs</Badge>
                      {shouldShowRanking(selectedAthlete) && (
                        <Badge className="bg-yellow-500 text-black text-xs md:text-sm">
                          Ranked #{selectedAthlete.prospect_ranking}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted" style={{ WebkitOverflowScrolling: 'touch' }}>
                <Tabs defaultValue="overview" className="mt-0">
                  <div className="-mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="bg-card border border-border grid grid-cols-4 md:grid-cols-8 gap-1 w-full h-auto">
                      <TabsTrigger
                        value="overview"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Overview
                      </TabsTrigger>
                      <TabsTrigger
                        value="performance"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Performance
                      </TabsTrigger>
                      <TabsTrigger
                        value="academics"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Academics
                      </TabsTrigger>
                      <TabsTrigger
                        value="documents"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Documents
                      </TabsTrigger>
                      <TabsTrigger
                        value="family"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Family
                      </TabsTrigger>
                      <TabsTrigger
                        value="notes"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Notes ({notes.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="financials"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Financials
                      </TabsTrigger>
                      <TabsTrigger
                        value="activity"
                        className="flex-shrink-0 whitespace-nowrap data-[state=active]:bg-muted touch-manipulation min-h-[44px]"
                        style={{ fontSize: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      >
                        Activity
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-2 md:mb-3">Contact Information</h3>
                      <div className="space-y-2 md:space-3 text-sm">
                        {/* Email */}
                        <div className="flex items-center gap-2 text-muted-foreground group">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                              className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 rounded px-2 py-1 -mx-2 -my-1"
                              onClick={() => startEditing("contactEmail", selectedAthlete.contactEmail)}
                            >
                              {selectedAthlete.contactEmail ? (
                                <a
                                  href={`mailto:${selectedAthlete.contactEmail}`}
                                  className="hover:text-blue-600 break-all flex-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {selectedAthlete.contactEmail}
                                </a>
                              ) : (
                                <span className="text-muted-foreground/70 italic">Click to add email</span>
                              )}
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* Phone */}
                        <div className="flex items-center gap-2 text-muted-foreground group">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                              className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 rounded px-2 py-1 -mx-2 -my-1"
                              onClick={() => startEditing("phone", selectedAthlete.phone)}
                            >
                              {selectedAthlete.phone ? (
                                <a
                                  href={`tel:${selectedAthlete.phone}`}
                                  className="hover:text-blue-600 flex-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {selectedAthlete.phone}
                                </a>
                              ) : (
                                <span className="text-muted-foreground/70 italic">Click to add phone</span>
                              )}
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 text-muted-foreground group">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                              className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 rounded px-2 py-1 -mx-2 -my-1"
                              onClick={() => startEditing("location", selectedAthlete.location)}
                            >
                              {selectedAthlete.location ? (
                                <span className="flex-1">{selectedAthlete.location}</span>
                              ) : (
                                <span className="text-muted-foreground/70 italic">Click to add location</span>
                              )}
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* Birthdate */}
                        <div className="flex items-center gap-2 text-muted-foreground group">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {editingField === "birthdate" ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                type="date"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => handleFieldUpdate("birthdate", editingValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleFieldUpdate("birthdate", editingValue)
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
                              className="flex-1 flex items-center gap-2 cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 rounded px-2 py-1 -mx-2 -my-1"
                              onClick={() => {
                                if (selectedAthlete.birthdate) {
                                  const dateStr = selectedAthlete.birthdate.includes('T') 
                                    ? selectedAthlete.birthdate.split('T')[0] 
                                    : selectedAthlete.birthdate
                                  startEditing("birthdate", dateStr)
                                } else {
                                  startEditing("birthdate", "")
                                }
                              }}
                            >
                              {selectedAthlete.birthdate ? (
                                <span className="flex-1">
                                  {(() => {
                                    const dateStr = selectedAthlete.birthdate.includes('T') 
                                      ? selectedAthlete.birthdate.split('T')[0] 
                                      : selectedAthlete.birthdate
                                    const [year, month, day] = dateStr.split('-').map(Number)
                                    const date = new Date(year, month - 1, day)
                                    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                  })()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/70 italic">Click to add birthdate</span>
                              )}
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedAthlete.bio && (
                      <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                        <h3 className="font-semibold text-foreground mb-2 md:mb-3">Bio</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{selectedAthlete.bio}</p>
                      </div>
                    )}

                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-2 md:mb-3">Recruiting Stage</h3>
                      <Select
                        value={(selectedAthlete.pipeline_stage || "Prospect").toLowerCase()}
                        onValueChange={(value) => handleStageChange(selectedAthlete.id, value)}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground hover:bg-muted/60 dark:hover:bg-muted/40">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border text-foreground">
                          <SelectItem value="prospect" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              Prospect
                            </div>
                          </SelectItem>
                          <SelectItem value="contacted" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              Contacted
                            </div>
                          </SelectItem>
                          <SelectItem value="recruiting" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              Recruiting
                            </div>
                          </SelectItem>
                          <SelectItem value="offered" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Offered
                            </div>
                          </SelectItem>
                          <SelectItem value="committed" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-600" />
                              Committed
                            </div>
                          </SelectItem>
                          <SelectItem value="signed" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                              Signed
                            </div>
                          </SelectItem>
                          <SelectItem value="lost" className="text-foreground hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Lost
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-2 md:mb-3">Public Profile</h3>
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
                    {/* Career Record */}
                    {selectedAthlete.careerRecord && (
                      <div className="bg-gradient-to-r from-[#002147] to-[#13294B] rounded-lg p-6 text-white mb-4">
                        <div className="text-sm font-semibold mb-2">Career Record</div>
                        <div className="text-4xl font-bold">{selectedAthlete.careerRecord}</div>
                      </div>
                    )}

                    {/* Tournament Results Display (uses column fallback when JSON empty) */}
                    <TournamentResultsDisplay
                      nchsaaResults={nchsaaResults}
                      nhscaResults={getNhscaResults(selectedAthlete)}
                      super32Results={getSuper32Results(selectedAthlete)}
                      nationalTeamResults={getNationalTeamResults(selectedAthlete)}
                    />

                    {/* Empty state */}
                    {!selectedAthlete.careerRecord && 
                     nchsaaResults.length === 0 &&
                     getNhscaResults(selectedAthlete).length === 0 &&
                     getSuper32Results(selectedAthlete).length === 0 &&
                     !selectedAthlete.college_opens_experience && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="italic">No performance data available</p>
                      </div>
                    )}

                    {selectedAthlete.achievements && selectedAthlete.achievements.length > 0 && (
                      <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                        <h3 className="font-semibold text-foreground mb-2 md:mb-3">Achievements</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedAthlete.achievements.map((achievement, index) => (
                            <Badge key={index} variant="secondary" className="bg-gray-100 text-muted-foreground text-xs">
                              {achievement}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {shouldShowRanking(selectedAthlete) && (
                      <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                        <h3 className="font-semibold text-foreground mb-2 md:mb-3">Rankings</h3>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                          <div className="text-sm text-yellow-500 mb-1">Prospect Ranking</div>
                          <div className="text-3xl font-bold text-yellow-500">#{selectedAthlete.prospect_ranking}</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="academics" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Academic Profile
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* GPA */}
                        <div className="bg-gray-100 rounded-lg p-4 group relative">
                          <div className="text-xs text-muted-foreground mb-1">GPA</div>
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
                              className="text-3xl font-bold h-12 text-blue-600"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-200 rounded p-1 -m-1"
                              onClick={() => startEditing("academic_gpa", selectedAthlete.academic_gpa)}
                            >
                              {selectedAthlete.academic_gpa ? (
                                <div className="text-3xl font-bold text-blue-600">
                                  {selectedAthlete.academic_gpa.toFixed(2)}
                                </div>
                              ) : (
                                <div className="text-3xl font-bold text-muted-foreground/70">-</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">4.0 Scale</div>
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                            </div>
                          )}
                        </div>

                        {/* SAT */}
                        <div className="bg-gray-100 rounded-lg p-4 group relative">
                          <div className="text-xs text-muted-foreground mb-1">SAT</div>
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
                              className="text-3xl font-bold h-12 text-blue-600"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-200 rounded p-1 -m-1"
                              onClick={() => startEditing("academic_sat", selectedAthlete.academic_sat)}
                            >
                              {selectedAthlete.academic_sat ? (
                                <div className="text-3xl font-bold text-blue-600">{selectedAthlete.academic_sat}</div>
                              ) : (
                                <div className="text-3xl font-bold text-muted-foreground/70">-</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">Out of 1600</div>
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                            </div>
                          )}
                        </div>

                        {/* ACT */}
                        <div className="bg-gray-100 rounded-lg p-4 group relative">
                          <div className="text-xs text-muted-foreground mb-1">ACT</div>
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
                              className="text-3xl font-bold h-12 text-blue-600"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-200 rounded p-1 -m-1"
                              onClick={() => startEditing("academic_act", selectedAthlete.academic_act)}
                            >
                              {selectedAthlete.academic_act ? (
                                <div className="text-3xl font-bold text-blue-600">{selectedAthlete.academic_act}</div>
                              ) : (
                                <div className="text-3xl font-bold text-muted-foreground/70">-</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">Out of 36</div>
                              <Edit2 className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedAthlete.academic_summary && (
                        <div className="mt-4 bg-gray-100 rounded-lg p-4">
                          <div className="text-sm font-semibold text-foreground mb-2">Academic Summary</div>
                          <p className="text-sm text-muted-foreground">{selectedAthlete.academic_summary}</p>
                        </div>
                      )}
                    </div>

                    {/* Coach's Academic Notes Section */}
                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Your Academic Notes
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Add your own academic information or notes that aren't in the public profile (e.g., GPA obtained during conversation, test scores, academic interests, etc.)
                      </p>
                      
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Example: Spoke with athlete - current GPA is 3.8, planning to retake SAT in spring, interested in Engineering program..."
                          value={academicNotes}
                          onChange={(e) => setAcademicNotes(e.target.value)}
                          rows={4}
                          className="w-full"
                        />
                        <Button
                          onClick={handleSaveAcademicNotes}
                          disabled={isSavingAcademicNotes}
                          className="w-full"
                        >
                          {isSavingAcademicNotes ? "Saving..." : "Save Academic Notes"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents & Media
                      </h3>

                      <div className="mb-4">
                        <label className="block">
                          <div className="border-2 border-dashed border-border/70 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer transition-colors">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadDocument(file)
                              }}
                              disabled={uploadingDocument}
                            />
                            <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <div className="text-sm text-muted-foreground">
                              {uploadingDocument ? "Uploading..." : "Click to upload document"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">PDF, DOC, or images</div>
                          </div>
                        </label>
                      </div>

                      {selectedAthlete.highlight_video_url && (
                        <div className="bg-gray-100 rounded-lg p-4 mb-3">
                          <div className="flex items-center gap-3 mb-2">
                            <Video className="h-5 w-5 text-blue-600" />
                            <div className="text-sm font-semibold text-foreground">Highlight Video</div>
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
                                  <div className="text-sm font-semibold text-foreground">{doc.file_name}</div>
                                  <div className="text-xs text-muted-foreground">
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
                                  className="text-muted-foreground/70 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!selectedAthlete.highlight_video_url && documents.length === 0 && (
                        <p className="text-muted-foreground italic">No documents or media uploaded yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="family" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
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
                        <div className="bg-muted rounded-lg p-4 mb-4 space-y-3 border border-border transition-colors">
                          <Input
                            placeholder="Name *"
                            value={newFamilyMember.name}
                            onChange={(e) => setNewFamilyMember({ ...newFamilyMember, name: e.target.value })}
                            className="bg-background border-border text-foreground"
                          />
                          <Select
                            value={newFamilyMember.relationship}
                            onValueChange={(value) => setNewFamilyMember({ ...newFamilyMember, relationship: value })}
                          >
                            <SelectTrigger className="bg-background border-border text-foreground">
                              <SelectValue placeholder="Relationship *" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border border-border text-foreground">
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
                            className="bg-background border-border text-foreground"
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={newFamilyMember.email}
                            onChange={(e) => setNewFamilyMember({ ...newFamilyMember, email: e.target.value })}
                            className="bg-background border-border text-foreground"
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleAddFamilyMember} className="bg-blue-600 hover:bg-blue-700">
                              Save Family Member
                            </Button>
                            <Button
                              onClick={() => setShowFamilyForm(false)}
                              variant="outline"
                              className="border-border text-muted-foreground hover:bg-muted/60 dark:hover:bg-muted/40"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {familyMembers.length > 0 ? (
                        <div className="space-y-3">
                          {familyMembers.map((member) => (
                            <div key={member.id} className="bg-card border border-border rounded-lg p-4 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-foreground">{member.name}</div>
                                  <div className="text-xs text-muted-foreground">{member.relationship}</div>
                                </div>
                                <button
                                  onClick={() => handleDeleteFamilyMember(member.id)}
                                  className="text-muted-foreground/70 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              {(member.phone || member.email) && (
                                <div className="space-y-1 mt-2">
                                  {member.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                      <a href={`tel:${member.phone}`} className="hover:text-blue-600">
                                        {member.phone}
                                      </a>
                                    </div>
                                  )}
                                  {member.email && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
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
                        <p className="text-muted-foreground italic">No family information available</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
                    {/* Add Note */}
                    <div className="bg-card rounded-lg p-3 md:p-4 border border-border transition-colors">
                      <h3 className="font-semibold text-foreground mb-2 md:mb-3">Add Note</h3>
                      <Textarea
                        placeholder="Add recruiting notes, call summaries, or observations..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground mb-3"
                        rows={3}
                      />
                      <Button onClick={handleAddNote} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-card border border-border rounded-lg p-3 md:p-4 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {note.note_type || "General"}
                            </Badge>
                            <div className="flex items-center gap-1 md:gap-2">
                              <span className="text-xs text-muted-foreground">
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
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-0.5 md:p-1 hover:bg-gray-100 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                className="bg-background border-border text-foreground"
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
                                  className="border-border text-muted-foreground hover:bg-muted/60 dark:hover:bg-muted/40"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">{note.note}</p>
                          )}
                        </div>
                      ))}

                      {notes.length === 0 && (
                        <div className="text-center py-4 md:py-8 text-muted-foreground">
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
                      <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                        <p className="text-xs text-muted-foreground">
                          The amount the family is expected to contribute toward college costs
                        </p>
                      </div>

                      {/* Ability to Pay */}
                      <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                      <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                      <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="giBillEligible"
                              checked={financialData.giBillEligible}
                              onCheckedChange={(checked) =>
                                setFinancialData({ ...financialData, giBillEligible: checked as boolean })
                              }
                            />
                            <Label htmlFor="giBillEligible" className="text-sm font-normal cursor-pointer">
                              Eligible for GI Bill Benefits
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Aid Needs */}
                    <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                      <p className="text-xs text-muted-foreground">
                        Specific financial aid needs, amounts required, or special circumstances
                      </p>
                    </div>

                    {/* Scholarship Requirements */}
                    <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                      <p className="text-xs text-muted-foreground">
                        Required scholarship amounts, athletic scholarship needs, or merit scholarship requirements
                      </p>
                    </div>

                    {/* Financial Concerns */}
                    <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                      <p className="text-xs text-muted-foreground">
                        Any financial concerns that may affect enrollment decisions
                      </p>
                    </div>

                    {/* Financial Notes */}
                    <div className="bg-card rounded-lg p-4 md:p-6 border border-border transition-colors">
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
                      <p className="text-xs text-muted-foreground">
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
                    <div className="bg-card border border-border rounded-lg p-3 md:p-4 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">Log Activity</h3>
                        <Button
                          onClick={() => setShowActivityDialog(!showActivityDialog)}
                          size="sm"
                          disabled={!canLogActivities}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {showActivityDialog ? "Cancel" : "New Activity"}
                        </Button>
                      </div>

                      {!canLogActivities && (
                        <p className="text-xs text-muted-foreground mb-3">
                          You&apos;re in admin preview mode. Impersonate a coach to log activities.
                        </p>
                      )}

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
                              <span className="text-sm text-muted-foreground">
                                {newActivity.isScheduled ? "Schedule Future Activity" : "Log Past Activity"}
                              </span>
                            </label>
                          </div>

                          {/* Activity Type Select */}
                          <Select
                            value={newActivity.actionType}
                            disabled={!canLogActivities}
                            onValueChange={(value) =>
                              setNewActivity({
                                ...newActivity,
                                actionType: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border text-foreground">
                              <SelectValue placeholder="Select activity type" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border border-border text-foreground">
                              {ACTIVITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            type="date"
                            value={newActivity.actionDate}
                            disabled={!canLogActivities}
                            onChange={(e) => setNewActivity({ ...newActivity, actionDate: e.target.value })}
                            className="bg-background border-border text-foreground"
                          />

                          <Textarea
                            placeholder="Description of activity... *"
                            value={newActivity.description}
                            disabled={!canLogActivities}
                            onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                            rows={3}
                          />

                          <Input
                            placeholder="Outcome (optional)"
                            value={newActivity.outcome}
                            disabled={!canLogActivities}
                            onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                            className="bg-background border-border text-foreground"
                          />

                          {/* Only show Follow-up Date input if isScheduled is true */}
                          {newActivity.isScheduled && (
                            <Input
                              type="date"
                              placeholder="Follow-up Date"
                              value={newActivity.followUpDate}
                              disabled={!canLogActivities}
                              onChange={(e) => setNewActivity({ ...newActivity, followUpDate: e.target.value })}
                              className="bg-background border-border text-foreground"
                            />
                          )}

                          <Button
                            onClick={handleAddActivity}
                            disabled={!canLogActivities}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {newActivity.isScheduled ? "Schedule Activity" : "Save Activity"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Activity List */}
                    {selectedAthleteActivities.length > 0 ? (
                      <div className="space-y-2 mt-4">
                        {selectedAthleteActivities.map((activity) => (
                          <div key={activity.id} className="bg-card border border-border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs uppercase">
                                  {activity.action_type.replace("_", " ")}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(activity.action_date).toLocaleDateString()}
                                </span>
                              </div>
                              {canLogActivities && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                  onClick={() => handleDeleteActivity(activity.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            {activity.outcome && (
                              <p className="text-xs text-muted-foreground mt-1">Outcome: {activity.outcome}</p>
                            )}
                            {activity.follow_up_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Follow-up: {new Date(activity.follow_up_date).toLocaleDateString()}
                              </p>
                            )}
                            {activity.coach_name && (
                              <p className="text-xs text-muted-foreground mt-1">Logged by {activity.coach_name}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground mt-4">
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
        <DialogContent className="bg-background border border-border text-foreground transition-colors">
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

      {/* Create New Prospect Modal */}
      <CreateProspectModal
        isOpen={showCreateProspectModal}
        onClose={() => setShowCreateProspectModal(false)}
        schoolId={params.schoolId}
        isDarkMode={isDarkMode}
        onProspectCreated={() => {
          setShowCreateProspectModal(false)
          fetchProspects() // Refresh the prospects list
        }}
      />
      </div>
    </div>
    </AuthGuard>
  )
}
