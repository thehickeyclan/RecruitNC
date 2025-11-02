"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { redirect, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RecruitingFunnelChart } from "@/components/recruiting-funnel-chart"
import { RecruitingActionsDashboard } from "@/components/recruiting-actions-dashboard"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Download,
  Search,
  X,
  Users,
  TrendingUp,
  Gift,
  CheckCircle,
  Star,
  Calendar,
  GripVertical,
  Plus,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface StarredAthlete {
  id: string
  name: string
  graduation_year: number
  weightclass: string
  highschool: string
  photourl: string
  college: string
  starred_at: string
  interest_level: string
  star_notes: string
  updated_at: string
  careerRecord: string
  location: string
  pipeline_stage: string
  last_contacted: string | null
  star_id: string
  ranking?: number
  athlete_email?: string
  athlete_cell?: string
  athlete_instagram?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  academic_gpa?: number
  academic_sat?: number
  academic_act?: number
  academic_interest?: string
  academic_summary?: string
  nhsca_2023_placement?: string
  nhsca_2023_record?: string
  nhsca_2024_placement?: string
  nhsca_2024_record?: string
  nhsca_2025_placement?: string
  nhsca_2025_record?: string
  super_32_2023_placement?: string
  super_32_2023_record?: string
  super_32_2024_placement?: string
  super_32_2024_record?: string
  super_32_2025_placement?: string
  super_32_2025_record?: string
  nationally_ranked_wins?: string
  additional_achievements?: string
  college_opens_experience?: string
  highlight_video_url?: string
  bio?: string
  bio_headline?: string
  wrestlingClub?: string
  ncUnitedTeam?: string
  recruiting_status?: string
  prospect_notes?: string
  evaluation_notes?: string
  socialMedia?: any
  actions?: any[]
  isPriority?: boolean
  isStarred?: boolean
}

interface Note {
  id: string
  note: string
  created_at: string
  note_type?: string
}

interface SeasonData {
  season: string
  grade: string
  total_matches: number
  wins: number
  losses: number
  pins: number
  tech_falls: number
  decisions: number
  major_decisions: number
  forfeits_won: number
}

interface SchoolBranding {
  school_name: string
  logo_url: string | null
  banner_url: string | null
  primary_color: string
  secondary_color: string
  school_id?: string
}

const PIPELINE_STAGES = ["Prospect", "Contacted", "Evaluating", "Recruiting", "Offered", "Committed", "Lost"]

export default function MyRecruitsPage() {
  const { isVerifiedCoach, isLoading, isAdmin } = useAuth()
  const router = useRouter()
  const [athletes, setAthletes] = useState<StarredAthlete[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<StarredAthlete[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [gradYearFilter, setGradYearFilter] = useState("all")
  const [weightClassFilter, setWeightClassFilter] = useState("all")
  const [draggedAthlete, setDraggedAthlete] = useState<StarredAthlete | null>(null)
  const [selectedAthlete, setSelectedAthlete] = useState<StarredAthlete | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [nchsaaResults, setNchsaaResults] = useState<any[]>([])
  const [isEditingParentInfo, setIsEditingParentInfo] = useState(false)
  const [parentInfo, setParentInfo] = useState({
    parent_name: "",
    parent_phone: "",
    parent_email: "",
  })
  const [seasonData, setSeasonData] = useState<SeasonData[]>([])
  const [isLoadingSeasonData, setIsLoadingSeasonData] = useState(false)

  const [showAddProspectModal, setShowAddProspectModal] = useState(false)
  const [prospectSearchQuery, setProspectSearchQuery] = useState("")
  const [prospectSearchResults, setProspectSearchResults] = useState<any[]>([])
  const [isSearchingProspects, setIsSearchingProspects] = useState(false)
  const [prospectGradYearFilter, setProspectGradYearFilter] = useState("all")
  const [prospectWeightFilter, setProspectWeightFilter] = useState("all")

  // State for new activity logging
  const [activityType, setActivityType] = useState("")
  const [activityDate, setActivityDate] = useState("")
  const [activityNotes, setActivityNotes] = useState("")
  const [activityOutcome, setActivityOutcome] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")

  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding | null>(null)

  useEffect(() => {
    console.log("[v0] My Recruits - Auth state:", {
      isLoading,
      isVerifiedCoach,
      isAdmin,
      athletesCount: athletes.length,
    })
  }, [isLoading, isVerifiedCoach, isAdmin, athletes.length])

  useEffect(() => {
    const checkSchoolAndRedirect = async () => {
      if (isLoading) {
        console.log("[v0] My Recruits - Waiting for auth to load before checking redirect")
        return
      }

      if (!isVerifiedCoach && !isAdmin) return

      // The branded portal is available at /schools/{schoolId}/portal if needed
      /*
      try {
        console.log("[v0] My Recruits - Checking school branding for redirect")
        const res = await fetch("/api/coaches/school-branding")
        if (res.ok) {
          const data = await res.json()
          console.log("[v0] My Recruits - School branding response:", data)
          if (data.school && data.school.school_id) {
            // Redirect to branded portal
            console.log("[v0] My Recruits - Redirecting to branded portal:", data.school.school_id)
            router.push(`/schools/${data.school.school_id}/portal`)
          }
        }
      } catch (error) {
        console.error("[v0] My Recruits - Error checking school:", error)
      }
      */
    }

    if (!isLoading) {
      checkSchoolAndRedirect()
    }
  }, [isLoading, isVerifiedCoach, isAdmin, router])

  useEffect(() => {
    if (!isLoading && !isVerifiedCoach && !isAdmin) {
      redirect("/auth/signin")
    }
  }, [isLoading, isVerifiedCoach, isAdmin])

  const fetchSchoolBranding = async () => {
    try {
      const res = await fetch("/api/coaches/school-branding")
      if (res.ok) {
        const data = await res.json()
        setSchoolBranding(data.school)
      }
    } catch (error) {
      console.error("Error fetching school branding:", error)
    }
  }

  const fetchAthletes = async () => {
    try {
      const res = await fetch("/api/coaches/starred-athletes")
      if (res.ok) {
        const data = await res.json()
        setAthletes(data.athletes || [])
        setFilteredAthletes(data.athletes || [])
      } else {
        console.error("Error fetching starred athletes:", res.status, res.statusText)
      }
    } catch (error) {
      console.error("Error fetching starred athletes:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (isVerifiedCoach || isAdmin) {
      fetchAthletes()
      fetchSchoolBranding()
    } else {
      setIsLoadingData(false)
    }
  }, [isVerifiedCoach, isAdmin, isLoading])

  useEffect(() => {
    let filtered = athletes

    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.highschool?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (gradYearFilter !== "all") {
      filtered = filtered.filter((a) => a.graduation_year === Number.parseInt(gradYearFilter))
    }

    if (weightClassFilter !== "all") {
      filtered = filtered.filter((a) => a.weightclass === weightClassFilter)
    }

    setFilteredAthletes(filtered)
  }, [searchQuery, gradYearFilter, weightClassFilter, athletes])

  const handleDragStart = (e: React.DragEvent, athlete: StarredAthlete) => {
    setDraggedAthlete(athlete)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    if (!draggedAthlete) return

    const previousStage = draggedAthlete.pipeline_stage

    // Update athletes array optimistically
    setAthletes((prevAthletes) =>
      prevAthletes.map((a) => (a.star_id === draggedAthlete.star_id ? { ...a, pipeline_stage: stage } : a)),
    )
    setFilteredAthletes((prevFiltered) =>
      prevFiltered.map((a) => (a.star_id === draggedAthlete.star_id ? { ...a, pipeline_stage: stage } : a)),
    )

    if (selectedAthlete && selectedAthlete.star_id === draggedAthlete.star_id) {
      setSelectedAthlete({ ...selectedAthlete, pipeline_stage: stage })
    }

    try {
      const res = await fetch("/api/coaches/update-pipeline-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starId: draggedAthlete.star_id,
          pipelineStage: stage,
        }),
      })

      if (res.ok) {
        console.log("[v0] Pipeline stage updated successfully")
      } else {
        console.error("[v0] Failed to update pipeline stage:", res.status)
        setAthletes((prevAthletes) =>
          prevAthletes.map((a) => (a.star_id === draggedAthlete.star_id ? { ...a, pipeline_stage: previousStage } : a)),
        )
        setFilteredAthletes((prevFiltered) =>
          prevFiltered.map((a) => (a.star_id === draggedAthlete.star_id ? { ...a, pipeline_stage: previousStage } : a)),
        )
        if (selectedAthlete && selectedAthlete.star_id === draggedAthlete.star_id) {
          setSelectedAthlete({ ...selectedAthlete, pipeline_stage: previousStage })
        }
        alert("Failed to update recruiting stage. Please try again.")
      }
    } catch (error) {
      console.error("Error updating pipeline stage:", error)
      setAthletes((prevAthletes) =>
        prevAthletes.map((a) => (a.star_id === draggedAthlete.star_id ? { ...a, pipeline_stage: previousStage } : a)),
      )
      setFilteredAthletes((prevFiltered) =>
        prevFiltered.map((a) => (a.star_id === draggedAthlete.star_id ? { ...a, pipeline_stage: previousStage } : a)),
      )
      if (selectedAthlete && selectedAthlete.star_id === draggedAthlete.star_id) {
        setSelectedAthlete({ ...selectedAthlete, pipeline_stage: previousStage })
      }
      alert("Error updating recruiting stage. Please try again.")
    } finally {
      setDraggedAthlete(null)
    }
  }

  const formatLastContact = (lastContacted: string | null) => {
    if (!lastContacted) return "Never"

    const now = new Date()
    const contactDate = new Date(lastContacted)
    const daysDiff = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff === 0) return "Today"
    if (daysDiff === 1) return "Yesterday"
    if (daysDiff < 7) return `${daysDiff}d ago`
    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)}w ago`
    return `${Math.floor(daysDiff / 30)}mo ago`
  }

  const getContactColor = (lastContacted: string | null) => {
    if (!lastContacted) return "text-muted-foreground"

    const daysDiff = Math.floor((new Date().getTime() - new Date(lastContacted).getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 14) return "text-red-600"
    if (daysDiff > 7) return "text-yellow-600"
    return "text-green-600"
  }

  const exportToCSV = () => {
    const headers = ["Rank", "Name", "Class", "School", "Weight", "Last Contact", "Pipeline Stage"]
    const rows = filteredAthletes.map((a, idx) => [
      idx + 1,
      a.name,
      a.graduation_year,
      a.highschool,
      a.weightclass,
      formatLastContact(a.last_contacted),
      a.pipeline_stage,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `my-recruits-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const openCRM = (athlete: StarredAthlete) => {
    setSelectedAthlete(athlete)
    fetchNotes(athlete.id)
    fetchNchsaaResults(athlete.name)
    fetchSeasonData(athlete.id)
    setParentInfo({
      parent_name: athlete.parent_name || "",
      parent_phone: athlete.parent_phone || "",
      parent_email: athlete.parent_email || "",
    })
    setIsEditingParentInfo(false)

    // Reset activity logging state
    setActivityType("")
    setActivityDate("")
    setActivityNotes("")
    setActivityOutcome("")
    setFollowUpDate("")
  }

  const fetchNchsaaResults = async (athleteName: string) => {
    try {
      const response = await fetch(
        `/api/coach-portal/tournament-results?athleteName=${encodeURIComponent(athleteName)}`,
      )
      const data = await response.json()

      if (data.success) {
        setNchsaaResults(data.nchsaaResults || [])
      }
    } catch (error) {
      console.error("Error fetching NCHSAA results:", error)
      setNchsaaResults([])
    }
  }

  const fetchSeasonData = async (athleteId: string) => {
    setIsLoadingSeasonData(true)
    try {
      const response = await fetch(`/api/athlete-matches/${athleteId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.matches && data.matches.length > 0) {
          // Extract season data from matches
          const seasons: SeasonData[] = data.matches.map((match: any) => ({
            season: match.season || "",
            grade: match.grade || "",
            total_matches: match.total_matches || 0,
            wins: match.wins || 0,
            losses: match.losses || 0,
            pins: match.pins || 0,
            tech_falls: match.tech_falls || 0,
            decisions: match.decisions || 0,
            major_decisions: match.major_decisions || 0,
            forfeits_won: match.forfeits_won || 0,
          }))
          setSeasonData(seasons)
        } else {
          setSeasonData([])
        }
      }
    } catch (error) {
      console.error("Error fetching season data:", error)
      setSeasonData([])
    } finally {
      setIsLoadingSeasonData(false)
    }
  }

  const handleSaveParentInfo = async () => {
    if (!selectedAthlete) return

    try {
      const response = await fetch("/api/coaches/update-parent-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starId: selectedAthlete.star_id,
          parentInfo,
        }),
      })

      if (response.ok) {
        setIsEditingParentInfo(false)
        await fetchAthletes()
        // Update selected athlete with new parent info
        if (selectedAthlete) {
          setSelectedAthlete({
            ...selectedAthlete,
            ...parentInfo,
          })
        }
      }
    } catch (error) {
      console.error("Error saving parent info:", error)
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
      console.error("Error fetching notes:", error)
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

  // Handler for logging new activity
  const handleLogActivity = async () => {
    if (!selectedAthlete || !activityType || !activityDate) return

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          activityType,
          activityDate,
          notes: activityNotes,
          outcome: activityOutcome,
          followUpDate: followUpDate || null,
        }),
      })

      if (response.ok) {
        // Refresh athlete data to show updated activities
        await fetchAthletes()
        // Re-fetch activities for the currently selected athlete
        const res = await fetch(`/api/coaches/starred-athletes/${selectedAthlete.id}`) // Assuming an endpoint to get a single athlete with actions
        if (res.ok) {
          const data = await res.json()
          setSelectedAthlete(data.athlete)
        }
        // Reset form
        setActivityType("")
        setActivityDate("")
        setActivityNotes("")
        setActivityOutcome("")
        setFollowUpDate("")
      }
    } catch (error) {
      console.error("Error logging activity:", error)
    }
  }

  const searchProspects = async () => {
    console.log("[v0] searchProspects called")
    setIsSearchingProspects(true)

    try {
      // Build query params
      const params = new URLSearchParams()
      if (prospectSearchQuery.trim()) {
        params.append("search", prospectSearchQuery.trim())
      }
      if (prospectGradYearFilter !== "all") {
        params.append("graduationyear", prospectGradYearFilter)
      }
      if (prospectWeightFilter !== "all") {
        params.append("weightclass", prospectWeightFilter)
      }

      console.log("[v0] Searching with params:", params.toString())

      const response = await fetch(`/api/athletes?${params.toString()}`)
      const data = await response.json()

      console.log("[v0] Search results:", data)

      if (response.ok && data.athletes) {
        // Filter out athletes already in the recruiting funnel
        const existingAthleteIds = new Set(athletes.map((a) => a.id))
        const filtered = data.athletes.filter((a: any) => !existingAthleteIds.has(a.id))

        console.log("[v0] Filtered results (excluding existing):", filtered.length)
        setProspectSearchResults(filtered)
      } else {
        console.error("[v0] Search failed:", data)
        setProspectSearchResults([])
      }
    } catch (error) {
      console.error("[v0] Error searching prospects:", error)
      setProspectSearchResults([])
    } finally {
      setIsSearchingProspects(false)
    }
  }

  const addProspectToFunnel = async (athleteId: string) => {
    console.log("[v0] addProspectToFunnel called for athlete:", athleteId)

    try {
      const response = await fetch("/api/coaches/toggle-star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          pipelineStage: "Prospect",
        }),
      })

      const data = await response.json()
      console.log("[v0] Toggle star response:", data)

      if (response.ok) {
        // Close modal and refresh athletes
        setShowAddProspectModal(false)
        setProspectSearchQuery("")
        setProspectSearchResults([])
        await fetchAthletes()
        console.log("[v0] Prospect added successfully")
      } else {
        console.error("[v0] Failed to add prospect:", data)
      }
    } catch (error) {
      console.error("[v0] Error adding prospect:", error)
    }
  }

  const gradYears = Array.from(new Set(athletes.map((a) => a.graduation_year))).sort()
  const weightClasses = Array.from(new Set(athletes.map((a) => a.weightclass).filter(Boolean))).sort()

  const stageCounts = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = athletes.filter((a) => a.pipeline_stage === stage).length
      return acc
    },
    {} as Record<string, number>,
  )

  const totalAthletes = athletes.length

  const getAthletesByStage = (stage: string) => {
    return filteredAthletes.filter((a) => a.pipeline_stage === stage)
  }

  const careerTotals = seasonData.reduce(
    (acc, season) => ({
      matches: acc.matches + season.total_matches,
      wins: acc.wins + season.wins,
      losses: acc.losses + season.losses,
      pins: acc.pins + season.pins,
      techFalls: acc.techFalls + season.tech_falls,
      decisions: acc.decisions + season.decisions,
      majorDec: acc.majorDec + season.major_decisions,
      forfeits: acc.forfeits + season.forfeits_won,
    }),
    { matches: 0, wins: 0, losses: 0, pins: 0, techFalls: 0, decisions: 0, majorDec: 0, forfeits: 0 },
  )

  const winPercentage = careerTotals.matches > 0 ? (careerTotals.wins / careerTotals.matches) * 100 : 0

  const metrics = {
    totalProspects: athletes.length,
    activeRecruiting: athletes.filter((a) => ["Contacted", "Evaluating", "Recruiting"].includes(a.pipeline_stage))
      .length,
    offersOut: athletes.filter((a) => a.pipeline_stage === "Offered").length,
    committed: athletes.filter((a) => a.pipeline_stage === "Committed").length,
  }

  const handleStageChange = async (athleteId: string, starId: string, newStage: string) => {
    console.log("[v0] handleStageChange called with:", {
      athleteId,
      starId,
      newStage,
      currentStage: selectedAthlete?.pipeline_stage,
    })

    if (!selectedAthlete) return

    const previousStage = selectedAthlete.pipeline_stage
    console.log("[v0] Previous stage:", previousStage, "New stage:", newStage)

    const dbStage = newStage

    // Optimistically update selectedAthlete
    const updatedAthlete = { ...selectedAthlete, pipeline_stage: dbStage }
    setSelectedAthlete(updatedAthlete)
    console.log("[v0] Updated selectedAthlete optimistically")

    // Optimistically update athletes array
    setAthletes((prevAthletes) =>
      prevAthletes.map((a) => (a.star_id === starId ? { ...a, pipeline_stage: dbStage } : a)),
    )
    setFilteredAthletes((prevFiltered) =>
      prevFiltered.map((a) => (a.star_id === starId ? { ...a, pipeline_stage: dbStage } : a)),
    )
    console.log("[v0] Updated athletes arrays optimistically")

    try {
      console.log("[v0] Making API call to update pipeline stage...")
      const response = await fetch("/api/coaches/update-pipeline-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starId: starId,
          pipelineStage: dbStage,
        }),
      })

      console.log("[v0] API response status:", response.status)
      if (response.ok) {
        console.log("[v0] Successfully updated pipeline stage to:", newStage)
      } else {
        const errorData = await response.json()
        console.error("[v0] Failed to update pipeline stage:", errorData)
        setSelectedAthlete({ ...selectedAthlete, pipeline_stage: previousStage })
        setAthletes((prevAthletes) =>
          prevAthletes.map((a) => (a.star_id === starId ? { ...a, pipeline_stage: previousStage } : a)),
        )
        setFilteredAthletes((prevFiltered) =>
          prevFiltered.map((a) => (a.star_id === starId ? { ...a, pipeline_stage: previousStage } : a)),
        )
        alert("Failed to update recruiting stage. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error updating pipeline stage:", error)
      setSelectedAthlete({ ...selectedAthlete, pipeline_stage: previousStage })
      setAthletes((prevAthletes) =>
        prevAthletes.map((a) => (a.star_id === starId ? { ...a, pipeline_stage: previousStage } : a)),
      )
      setFilteredAthletes((prevFiltered) =>
        prevFiltered.map((a) => (a.star_id === starId ? { ...a, pipeline_stage: previousStage } : a)),
      )
      alert("Error updating recruiting stage. Please try again.")
    }
  }

  if (isLoading || (!isVerifiedCoach && !isAdmin)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Loading your recruits...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {schoolBranding && (
            <div
              className="rounded-xl p-6 flex items-center gap-6 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${schoolBranding.primary_color} 0%, ${schoolBranding.secondary_color} 100%)`,
              }}
            >
              {schoolBranding.logo_url && (
                <img
                  src={schoolBranding.logo_url || "/placeholder.svg"}
                  alt={schoolBranding.school_name}
                  className="h-20 w-20 object-contain bg-white rounded-xl p-2 shadow-md"
                />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{schoolBranding.school_name}</h2>
                <p className="text-white/90 mt-1">Wrestling Recruiting Portal</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#0D1A4D]">My Recruiting Board</h1>
              <p className="text-gray-600 mt-2 text-lg">
                {totalAthletes} athlete{totalAthletes !== 1 ? "s" : ""} in your pipeline
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-[#D3B574] text-[#D3B574] hover:bg-[#D3B574] hover:text-white transition-colors bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => {
                  console.log("[v0] Look Up Prospects button clicked - redirecting to rankings")
                  window.location.href = "/rankings"
                }}
                className="bg-[#D3B574] hover:bg-[#CBAF5D] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Look Up Prospects
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Prospects Card */}
            <Card className="border-2 border-gray-200 hover:border-[#D3B574] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#D3B574] to-[#CBAF5D] flex items-center justify-center shadow-md">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Total
                  </Badge>
                </div>
                <p className="text-4xl font-bold text-[#0D1A4D] mb-1">{metrics.totalProspects}</p>
                <p className="text-sm text-gray-500 font-medium">Total Prospects</p>
              </CardContent>
            </Card>

            {/* Active Recruiting Card */}
            <Card className="border-2 border-gray-200 hover:border-[#D3B574] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center shadow-md">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Active
                  </Badge>
                </div>
                <p className="text-4xl font-bold text-[#0D1A4D] mb-1">{metrics.activeRecruiting}</p>
                <p className="text-sm text-gray-500 font-medium">Active Recruiting</p>
              </CardContent>
            </Card>

            {/* Offers Out Card */}
            <Card className="border-2 border-gray-200 hover:border-[#D3B574] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#F97316] to-[#FB923C] flex items-center justify-center shadow-md">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    Pending
                  </Badge>
                </div>
                <p className="text-4xl font-bold text-[#0D1A4D] mb-1">{metrics.offersOut}</p>
                <p className="text-sm text-gray-500 font-medium">Offers Out</p>
              </CardContent>
            </Card>

            {/* Committed Card */}
            <Card className="border-2 border-gray-200 hover:border-[#D3B574] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-md">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Success
                  </Badge>
                </div>
                <p className="text-4xl font-bold text-[#0D1A4D] mb-1">{metrics.committed}</p>
                <p className="text-sm text-gray-500 font-medium">Committed</p>
              </CardContent>
            </Card>
          </div>

          <RecruitingFunnelChart stageCounts={stageCounts} />

          <RecruitingActionsDashboard />

          <Card className="border-2 border-gray-200 shadow-md">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or school..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-[#D3B574] focus:ring-[#D3B574]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select value={gradYearFilter} onValueChange={setGradYearFilter}>
                  <SelectTrigger className="border-gray-300 focus:border-[#D3B574] focus:ring-[#D3B574]">
                    <SelectValue placeholder="All Grad Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grad Years</SelectItem>
                    {gradYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        Class of {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={weightClassFilter} onValueChange={setWeightClassFilter}>
                  <SelectTrigger className="border-gray-300 focus:border-[#D3B574] focus:ring-[#D3B574]">
                    <SelectValue placeholder="All Weight Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Weight Classes</SelectItem>
                    {weightClasses.map((wc) => (
                      <SelectItem key={wc} value={wc}>
                        {wc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoadingData ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading your recruits...</p>
            </div>
          ) : (
            <div
              className="overflow-x-auto pb-4 -mx-4 px-4"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollBehavior: "smooth",
                touchAction: "pan-x",
              }}
            >
              <div className="flex gap-4 min-w-max">
                {PIPELINE_STAGES.map((stage) => {
                  const stageAthletes = getAthletesByStage(stage)
                  const stageColors = {
                    Prospect: "from-blue-500 to-blue-600",
                    Contacted: "from-indigo-500 to-indigo-600",
                    Evaluating: "from-purple-500 to-purple-600",
                    Recruiting: "from-pink-500 to-pink-600",
                    Offered: "from-orange-500 to-orange-600",
                    Committed: "from-green-500 to-green-600",
                    Lost: "from-gray-500 to-gray-600",
                  }
                  return (
                    <div
                      key={stage}
                      className="flex flex-col w-[300px] flex-shrink-0"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage)}
                    >
                      <div
                        className={`bg-gradient-to-r ${stageColors[stage as keyof typeof stageColors]} rounded-t-xl p-4 shadow-md`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-white text-sm uppercase tracking-wide">{stage}</h3>
                          <Badge className="bg-white/20 text-white border-white/30 font-bold px-2 py-1">
                            {stageAthletes.length}
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-gray-100 rounded-b-xl p-3 space-y-3 min-h-[400px] flex-1 border-2 border-gray-200">
                        {stageAthletes.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-4">
                            Drag athletes here or click to open and change stage
                          </p>
                        )}
                        {stageAthletes.map((athlete) => (
                          <Card
                            key={athlete.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, athlete)}
                            className="cursor-grab active:cursor-grabbing hover:shadow-xl transition-all duration-200 border-l-4 border-[#D3B574] hover:-translate-y-1 bg-white"
                          >
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D3B574] to-[#CBAF5D] flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                                  {athlete.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => openCRM(athlete)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="font-semibold text-sm hover:text-[#0D1A4D] transition-colors text-left w-full truncate"
                                  >
                                    {athlete.name}
                                  </button>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Class of {athlete.graduation_year} • {athlete.weightclass}
                                  </p>
                                </div>
                                <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0 cursor-grab" />
                              </div>

                              <div className="space-y-2 text-xs">
                                {athlete.ranking && athlete.ranking <= 30 && (
                                  <div className="flex items-center gap-2">
                                    <Star className="h-3 w-3 text-[#D3B574]" />
                                    <span className="font-medium text-[#D3B574]">Ranked #{athlete.ranking}</span>
                                  </div>
                                )}
                                {athlete.careerRecord && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Record</span>
                                    <span className="font-semibold text-[#B31B1B]">{athlete.careerRecord}</span>
                                  </div>
                                )}
                                <div className="text-xs text-gray-600 truncate">{athlete.highschool}</div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                  {athlete.isPriority && (
                                    <Badge className="bg-[#B31B1B] text-white text-[10px] px-1.5 py-0.5">
                                      Priority
                                    </Badge>
                                  )}
                                  {athlete.isStarred && <Star className="h-3 w-3 text-[#D3B574] fill-[#D3B574]" />}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span
                                    className={`text-[10px] font-medium ${getContactColor(athlete.last_contacted)}`}
                                  >
                                    {formatLastContact(athlete.last_contacted)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Dialog open={!!selectedAthlete} onOpenChange={(open) => !open && setSelectedAthlete(null)}>
            <DialogContent className="max-w-6xl min-h-[90vh] max-h-[90vh] flex flex-col p-0">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-[100] h-10 w-10 rounded-full bg-white shadow-lg border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all md:right-4 md:top-4"
                onClick={() => setSelectedAthlete(null)}
              >
                <X className="h-6 w-6 text-gray-700" />
                <span className="sr-only">Close</span>
              </Button>
              {/* </CHANGE> */}
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <div className="flex items-start gap-4">
                  <img
                    src={selectedAthlete?.photourl || "/placeholder.svg?height=100&width=100&query=wrestler"}
                    alt={selectedAthlete?.name}
                    className="w-24 h-24 rounded-lg object-cover border-2 border-primary"
                  />
                  <div className="flex-1">
                    <DialogTitle className="text-3xl font-bold">{selectedAthlete?.name}</DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      {selectedAthlete?.highschool} • Class of {selectedAthlete?.graduation_year}
                    </DialogDescription>
                    {selectedAthlete?.bio_headline && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{selectedAthlete.bio_headline}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary" className="text-sm">
                        Class of {selectedAthlete?.graduation_year}
                      </Badge>
                      <Badge variant="secondary" className="text-sm">
                        {selectedAthlete?.weightclass}
                      </Badge>
                      {selectedAthlete?.ranking && selectedAthlete.ranking <= 30 && (
                        <Badge className="bg-yellow-500 text-black text-sm">Ranked #{selectedAthlete.ranking}</Badge>
                      )}
                      {selectedAthlete?.recruiting_status && (
                        <Badge variant="outline" className="text-sm">
                          {selectedAthlete.recruiting_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {selectedAthlete && (
                  <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="w-full flex overflow-x-auto md:grid md:grid-cols-5 gap-1 scrollbar-hide">
                      <TabsTrigger value="overview" className="flex-shrink-0 px-4 whitespace-nowrap">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="academic" className="flex-shrink-0 px-4 whitespace-nowrap">
                        Academic
                      </TabsTrigger>
                      <TabsTrigger value="athletic" className="flex-shrink-0 px-4 whitespace-nowrap">
                        Athletic
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="flex-shrink-0 px-4 whitespace-nowrap">
                        Activity
                      </TabsTrigger>
                      <TabsTrigger value="recruiting" className="flex-shrink-0 px-4 whitespace-nowrap">
                        Recruiting
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-6">
                      {/* Contact Information */}
                      <div className="bg-gradient-to-br from-[#03154C] to-[#012ECD] text-white rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <span className="text-[#D3B574]">📞</span> Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-white/70 mb-1">Athlete Email</p>
                              <p className="font-medium">{selectedAthlete.athlete_email || "Not provided"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-white/70 mb-1">Athlete Cell</p>
                              <p className="font-medium">{selectedAthlete.athlete_cell || "Not provided"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-white/70 mb-1">Instagram</p>
                              {selectedAthlete.athlete_instagram ? (
                                <a
                                  href={`https://instagram.com/${selectedAthlete.athlete_instagram.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-[#D3B574] transition-colors"
                                >
                                  @{selectedAthlete.athlete_instagram.replace("@", "")}
                                </a>
                              ) : (
                                <p className="font-medium">Not provided</p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-3">
                            {!isEditingParentInfo ? (
                              <>
                                <div>
                                  <p className="text-sm text-white/70 mb-1">Parent/Guardian</p>
                                  <p className="font-medium">{selectedAthlete.parent_name || "Not provided"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-white/70 mb-1">Parent Phone</p>
                                  <p className="font-medium">{selectedAthlete.parent_phone || "Not provided"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-white/70 mb-1">Parent Email</p>
                                  <p className="font-medium">{selectedAthlete.parent_email || "Not provided"}</p>
                                </div>
                                <Button
                                  onClick={() => setIsEditingParentInfo(true)}
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
                                >
                                  Edit Parent Info
                                </Button>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-sm text-white/70 mb-1">Parent/Guardian</p>
                                  <Input
                                    value={parentInfo.parent_name}
                                    onChange={(e) => setParentInfo({ ...parentInfo, parent_name: e.target.value })}
                                    className="bg-white/10 border-white/30 text-white"
                                    placeholder="Parent name"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm text-white/70 mb-1">Parent Phone</p>
                                  <Input
                                    value={parentInfo.parent_phone}
                                    onChange={(e) => setParentInfo({ ...parentInfo, parent_phone: e.target.value })}
                                    className="bg-white/10 border-white/30 text-white"
                                    placeholder="Parent phone"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm text-white/70 mb-1">Parent Email</p>
                                  <Input
                                    value={parentInfo.parent_email}
                                    onChange={(e) => setParentInfo({ ...parentInfo, parent_email: e.target.value })}
                                    className="bg-white/10 border-white/30 text-white"
                                    placeholder="Parent email"
                                  />
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    onClick={handleSaveParentInfo}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setIsEditingParentInfo(false)
                                      setParentInfo({
                                        parent_name: selectedAthlete.parent_name || "",
                                        parent_phone: selectedAthlete.parent_phone || "",
                                        parent_email: selectedAthlete.parent_email || "",
                                      })
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {selectedAthlete.location && (
                          <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-sm text-white/70 mb-1">Location</p>
                            <p className="font-medium">{selectedAthlete.location}</p>
                          </div>
                        )}
                      </div>

                      {/* Athlete Profile */}
                      <div className="bg-muted rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4">Athlete Profile</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Weight Class</p>
                            <Badge variant="secondary" className="text-base">
                              {selectedAthlete.weightclass}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Career Record</p>
                            <p className="font-bold text-lg">{selectedAthlete.careerRecord || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">High School</p>
                            <p className="font-medium">{selectedAthlete.highschool}</p>
                          </div>
                          {selectedAthlete.wrestlingClub && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Wrestling Club</p>
                              <p className="font-medium">{selectedAthlete.wrestlingClub}</p>
                            </div>
                          )}
                          {selectedAthlete.ncUnitedTeam && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">NC United Team</p>
                              <p className="font-medium">{selectedAthlete.ncUnitedTeam}</p>
                            </div>
                          )}
                        </div>
                        {selectedAthlete.bio && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-2">Bio</p>
                            <p className="text-sm leading-relaxed">{selectedAthlete.bio}</p>
                          </div>
                        )}
                      </div>

                      {/* Highlight Video */}
                      {selectedAthlete.highlight_video_url && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Highlight Video</h3>
                          <a
                            href={selectedAthlete.highlight_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                          >
                            View Highlight Reel →
                          </a>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="academic" className="space-y-6 mt-6">
                      <div className="bg-gradient-to-br from-[#03154C] to-[#012ECD] text-white rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <span className="text-[#D3B574]">🎓</span> Academic Profile
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-sm text-white/70 mb-1">GPA</p>
                            <p className="font-bold text-3xl">
                              {selectedAthlete.academic_gpa ? selectedAthlete.academic_gpa.toFixed(2) : "N/A"}
                            </p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-sm text-white/70 mb-1">SAT Score</p>
                            <p className="font-bold text-3xl">{selectedAthlete.academic_sat || "N/A"}</p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-sm text-white/70 mb-1">ACT Score</p>
                            <p className="font-bold text-3xl">{selectedAthlete.academic_act || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {selectedAthlete.academic_interest && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-semibold text-lg mb-3">Academic Interests</h3>
                          <p className="text-sm">{selectedAthlete.academic_interest}</p>
                        </div>
                      )}

                      {selectedAthlete.academic_summary && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-semibold text-lg mb-3">Academic Summary</h3>
                          <p className="text-sm leading-relaxed">{selectedAthlete.academic_summary}</p>
                        </div>
                      )}

                      {!selectedAthlete.academic_gpa &&
                        !selectedAthlete.academic_sat &&
                        !selectedAthlete.academic_act &&
                        !selectedAthlete.academic_interest &&
                        !selectedAthlete.academic_summary && (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>No academic information available yet.</p>
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="athletic" className="space-y-6 mt-6">
                      {/* Career Record */}
                      <div className="bg-gradient-to-br from-[#BC0B03] to-[#03154C] text-white rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <span className="text-[#D3B574]">🏆</span> Career Record
                        </h3>
                        <p className="font-bold text-4xl">{selectedAthlete.careerRecord || "N/A"}</p>
                      </div>

                      {seasonData.length > 0 && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">High School Career Summary</h3>

                          {/* Career Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-[#BC0B03] to-[#03154C] text-white rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold">
                                {careerTotals.wins}-{careerTotals.losses}
                              </p>
                              <p className="text-sm opacity-90 mt-1">Career Record</p>
                            </div>
                            <div className="bg-gradient-to-br from-[#03154C] to-[#012ECD] text-white rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-[#D3B574]">{winPercentage.toFixed(1)}%</p>
                              <p className="text-sm opacity-90 mt-1">Win Percentage</p>
                            </div>
                            <div className="bg-background border-2 border-[#BC0B03] rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-[#BC0B03]">{careerTotals.pins}</p>
                              <p className="text-sm text-muted-foreground mt-1">Pins</p>
                            </div>
                            <div className="bg-background border-2 border-[#012ECD] rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-[#012ECD]">{careerTotals.techFalls}</p>
                              <p className="text-sm text-muted-foreground mt-1">Tech Falls</p>
                            </div>
                          </div>

                          {/* Season Summary Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-[#03154C] text-white">
                                  <th className="px-3 py-2 text-left font-semibold">Year</th>
                                  <th className="px-3 py-2 text-left font-semibold">Grade</th>
                                  <th className="px-3 py-2 text-left font-semibold">Matches</th>
                                  <th className="px-3 py-2 text-left font-semibold">Record</th>
                                  <th className="px-3 py-2 text-left font-semibold">Pins</th>
                                  <th className="px-3 py-2 text-left font-semibold">Tech Falls</th>
                                  <th className="px-3 py-2 text-left font-semibold">Decisions</th>
                                  <th className="px-3 py-2 text-left font-semibold">Major Dec</th>
                                  <th className="px-3 py-2 text-left font-semibold">Forfeits</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {seasonData.map((season, index) => (
                                  <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                    <td className="px-3 py-2 text-gray-900">{season.season}</td>
                                    <td className="px-3 py-2 text-gray-600 capitalize">{season.grade}</td>
                                    <td className="px-3 py-2 text-gray-900">{season.total_matches}</td>
                                    <td className="px-3 py-2 font-semibold text-[#BC0B03]">
                                      {season.wins}-{season.losses}
                                    </td>
                                    <td className="px-3 py-2 text-gray-900">{season.pins}</td>
                                    <td className="px-3 py-2 text-gray-900">{season.tech_falls}</td>
                                    <td className="px-3 py-2 text-gray-900">{season.decisions}</td>
                                    <td className="px-3 py-2 text-gray-900">{season.major_decisions}</td>
                                    <td className="px-3 py-2 text-gray-900">{season.forfeits_won}</td>
                                  </tr>
                                ))}
                                {/* Career Totals Row */}
                                <tr className="bg-[#BC0B03] text-white font-bold">
                                  <td className="px-3 py-2">CAREER</td>
                                  <td className="px-3 py-2">TOTALS</td>
                                  <td className="px-3 py-2">{careerTotals.matches}</td>
                                  <td className="px-3 py-2">
                                    {careerTotals.wins}-{careerTotals.losses}
                                  </td>
                                  <td className="px-3 py-2">{careerTotals.pins}</td>
                                  <td className="px-3 py-2">{careerTotals.techFalls}</td>
                                  <td className="px-3 py-2">{careerTotals.decisions}</td>
                                  <td className="px-3 py-2">{careerTotals.majorDec}</td>
                                  <td className="px-3 py-2">{careerTotals.forfeits}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* NCHSAA State Tournament Results */}
                      {nchsaaResults.length > 0 && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">NCHSAA State Tournament</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {nchsaaResults.map((result, idx) => (
                              <div key={idx} className="bg-background rounded-lg p-4 border-l-4 border-[#BC0B03]">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge className="bg-[#03154C] text-white">{result.year}</Badge>
                                  <Badge variant="outline">{result.classification}</Badge>
                                </div>
                                <p className="font-bold text-2xl text-[#BC0B03] mb-1">
                                  {result.place === 1
                                    ? "🥇 Champion"
                                    : result.place === 2
                                      ? "🥈 2nd Place"
                                      : result.place === 3
                                        ? "🥉 3rd Place"
                                        : `${result.place}th Place`}
                                </p>
                                <p className="text-sm text-muted-foreground">{result.weight_class}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NHSCA Results */}
                      {(selectedAthlete.nhsca_2023_placement ||
                        selectedAthlete.nhsca_2024_placement ||
                        selectedAthlete.nhsca_2025_placement) && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">NHSCA Nationals</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedAthlete.nhsca_2025_placement && (
                              <div className="bg-background rounded-lg p-4 border-l-4 border-[#012ECD]">
                                <Badge className="bg-[#03154C] text-white mb-2">2025</Badge>
                                <p className="font-bold text-xl mb-1">{selectedAthlete.nhsca_2025_placement}</p>
                                {selectedAthlete.nhsca_2025_record && (
                                  <p className="text-sm text-muted-foreground">
                                    Record: {selectedAthlete.nhsca_2025_record}
                                  </p>
                                )}
                              </div>
                            )}
                            {selectedAthlete.nhsca_2024_placement && (
                              <div className="bg-background rounded-lg p-4 border-l-4 border-[#012ECD]">
                                <Badge className="bg-[#03154C] text-white mb-2">2024</Badge>
                                <p className="font-bold text-xl mb-1">{selectedAthlete.nhsca_2024_placement}</p>
                                {selectedAthlete.nhsca_2024_record && (
                                  <p className="text-sm text-muted-foreground">
                                    Record: {selectedAthlete.nhsca_2024_record}
                                  </p>
                                )}
                              </div>
                            )}
                            {selectedAthlete.nhsca_2023_placement && (
                              <div className="bg-background rounded-lg p-4 border-l-4 border-[#012ECD]">
                                <Badge className="bg-[#03154C] text-white mb-2">2023</Badge>
                                <p className="font-bold text-xl mb-1">{selectedAthlete.nhsca_2023_placement}</p>
                                {selectedAthlete.nhsca_2023_record && (
                                  <p className="text-sm text-muted-foreground">
                                    Record: {selectedAthlete.nhsca_2023_record}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Super 32 Results */}
                      {(selectedAthlete.super_32_2023_placement ||
                        selectedAthlete.super_32_2024_placement ||
                        selectedAthlete.super_32_2025_placement) && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Super 32</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedAthlete.super_32_2025_placement && (
                              <div className="bg-background rounded-lg p-4 border-l-4 border-[#D3B574]">
                                <Badge className="bg-[#03154C] text-white mb-2">2025</Badge>
                                <p className="font-bold text-xl mb-1">{selectedAthlete.super_32_2025_placement}</p>
                                {selectedAthlete.super_32_2025_record && (
                                  <p className="text-sm text-muted-foreground">
                                    Record: {selectedAthlete.super_32_2025_record}
                                  </p>
                                )}
                              </div>
                            )}
                            {selectedAthlete.super_32_2024_placement && (
                              <div className="bg-background rounded-lg p-4 border-l-4 border-[#D3B574]">
                                <Badge className="bg-[#03154C] text-white mb-2">2024</Badge>
                                <p className="font-bold text-xl mb-1">{selectedAthlete.super_32_2024_placement}</p>
                                {selectedAthlete.super_32_2024_record && (
                                  <p className="text-sm text-muted-foreground">
                                    Record: {selectedAthlete.super_32_2024_record}
                                  </p>
                                )}
                              </div>
                            )}
                            {selectedAthlete.super_32_2023_placement && (
                              <div className="bg-background rounded-lg p-4 border-l-4 border-[#D3B574]">
                                <Badge className="bg-[#03154C] text-white mb-2">2023</Badge>
                                <p className="font-bold text-xl mb-1">{selectedAthlete.super_32_2023_placement}</p>
                                {selectedAthlete.super_32_2023_record && (
                                  <p className="text-sm text-muted-foreground">
                                    Record: {selectedAthlete.super_32_2023_record}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* College Opens Experience */}
                      {selectedAthlete.college_opens_experience && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">College Opens</h3>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedAthlete.college_opens_experience}
                          </p>
                        </div>
                      )}

                      {/* Ranked Wins */}
                      {selectedAthlete.nationally_ranked_wins && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Nationally Ranked Wins</h3>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedAthlete.nationally_ranked_wins}
                          </p>
                        </div>
                      )}

                      {/* Additional Achievements */}
                      {selectedAthlete.additional_achievements && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Additional Achievements</h3>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedAthlete.additional_achievements}
                          </p>
                        </div>
                      )}

                      {/* Highlight Video */}
                      {selectedAthlete.highlight_video_url && (
                        <div className="bg-gradient-to-br from-[#03154C] to-[#012ECD] text-white rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Highlight Video</h3>
                          <a
                            href={selectedAthlete.highlight_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#D3B574] hover:underline font-medium text-lg"
                          >
                            View Highlight Reel →
                          </a>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="activity" className="space-y-6 mt-6">
                      {/* Activity Timeline */}
                      <div className="bg-gradient-to-br from-[#03154C] to-[#012ECD] text-white rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <span className="text-[#D3B574]">📅</span> Activity Timeline
                        </h3>
                        <p className="text-sm text-white/80">Track all engagement with this athlete</p>
                      </div>

                      {/* Log New Activity */}
                      <div className="bg-muted rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4">Log New Activity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Activity Type</label>
                            <Select value={activityType} onValueChange={setActivityType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select activity type..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="phone_call">Phone Call</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="text">Text Message</SelectItem>
                                <SelectItem value="in_person">In-Person Visit</SelectItem>
                                <SelectItem value="video_call">Video Call</SelectItem>
                                <SelectItem value="camp">Camp Interaction</SelectItem>
                                <SelectItem value="showcase">Showcase</SelectItem>
                                <SelectItem value="official_visit">Official Visit</SelectItem>
                                <SelectItem value="unofficial_visit">Unofficial Visit</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Activity Date</label>
                            <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="text-sm font-medium mb-2 block">Notes</label>
                          <Textarea
                            placeholder="Add notes about this interaction..."
                            rows={3}
                            value={activityNotes}
                            onChange={(e) => setActivityNotes(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Outcome</label>
                            <Select value={activityOutcome} onValueChange={setActivityOutcome}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select outcome..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="interested">Very Interested</SelectItem>
                                <SelectItem value="somewhat_interested">Somewhat Interested</SelectItem>
                                <SelectItem value="not_interested">Not Interested</SelectItem>
                                <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
                                <SelectItem value="no_response">No Response</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Schedule Follow-up (Optional)</label>
                            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                          </div>
                        </div>
                        <Button onClick={handleLogActivity} className="bg-[#03154C] hover:bg-[#012ECD]">
                          <Plus className="h-4 w-4 mr-2" />
                          Log Activity
                        </Button>
                      </div>

                      {/* Activity History */}
                      <div className="bg-muted rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4">Activity History</h3>
                        <div className="space-y-4">
                          {selectedAthlete?.actions && selectedAthlete.actions.length > 0 ? (
                            selectedAthlete.actions.map((action: any) => (
                              <div key={action.id} className="bg-background rounded-lg p-4 border-l-4 border-[#BC0B03]">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-[#03154C] text-white">{action.action_type}</Badge>
                                    {action.coach && (
                                      <span className="text-xs text-muted-foreground">
                                        by {action.coach.full_name} ({action.coach.institution})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(action.action_date).toLocaleDateString()}
                                  </span>
                                </div>
                                {action.description && <p className="text-sm mt-2">{action.description}</p>}
                                {action.outcome && (
                                  <Badge variant="outline" className="mt-2">
                                    {action.outcome}
                                  </Badge>
                                )}
                                {action.follow_up_date && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Follow-up: {new Date(action.follow_up_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No activities logged yet. Start tracking your engagement above!</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upcoming Follow-ups */}
                      <div className="bg-muted rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4">Upcoming Follow-ups</h3>
                        <div className="space-y-3">
                          {selectedAthlete?.actions
                            ?.filter(
                              (action: any) => action.follow_up_date && new Date(action.follow_up_date) > new Date(),
                            )
                            .map((action: any) => (
                              <div key={action.id} className="bg-background rounded-lg p-4 border-l-4 border-[#D3B574]">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Badge variant="outline" className="mb-1">
                                      {action.action_type}
                                    </Badge>
                                    <p className="text-sm font-medium">
                                      Follow-up on {new Date(action.follow_up_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline">
                                    Mark Complete
                                  </Button>
                                </div>
                              </div>
                            )) || (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No upcoming follow-ups scheduled.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="recruiting" className="space-y-6 mt-6">
                      {/* Recruiting Status */}
                      <div className="bg-gradient-to-br from-[#03154C] to-[#012ECD] text-white rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <span className="text-[#D3B574]">📊</span> Recruiting Status
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-white/70 mb-1">Pipeline Stage</p>
                            <Select
                              value={selectedAthlete.pipeline_stage}
                              onValueChange={(value) =>
                                handleStageChange(selectedAthlete.id, selectedAthlete.star_id, value)
                              }
                            >
                              <SelectTrigger className="bg-white/10 text-white font-semibold border-white/30 hover:bg-white/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PIPELINE_STAGES.map((stage) => (
                                  <SelectItem key={stage} value={stage}>
                                    {stage}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedAthlete.interest_level && (
                            <div>
                              <p className="text-sm text-white/70 mb-1">Interest Level</p>
                              <Badge variant="outline" className="border-white text-white text-base px-3 py-1">
                                {selectedAthlete.interest_level}
                              </Badge>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-white/70 mb-1">Last Contact</p>
                            <p className={`font-medium ${getContactColor(selectedAthlete.last_contacted)}`}>
                              {formatLastContact(selectedAthlete.last_contacted)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-white/70 mb-1">Added to Board</p>
                            <p className="font-medium">{new Date(selectedAthlete.starred_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Communication History */}
                      {selectedAthlete.actions && selectedAthlete.actions.length > 0 && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Communication History</h3>
                          <div className="space-y-3">
                            {selectedAthlete.actions.map((action: any) => (
                              <div key={action.id} className="bg-background rounded-lg p-4 border-l-4 border-primary">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="outline">{action.action_type}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(action.action_date).toLocaleDateString()}
                                  </span>
                                </div>
                                {action.description && <p className="text-sm mt-2">{action.description}</p>}
                                {action.outcome && (
                                  <p className="text-xs text-muted-foreground mt-1">Outcome: {action.outcome}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* My Notes */}
                      {selectedAthlete.star_notes && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">My Notes</h3>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedAthlete.star_notes}</p>
                        </div>
                      )}

                      {/* Evaluation Notes */}
                      {selectedAthlete.evaluation_notes && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">Evaluation Notes</h3>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {selectedAthlete.evaluation_notes}
                          </p>
                        </div>
                      )}

                      {/* Add Note Section */}
                      <div className="bg-muted rounded-lg p-6">
                        <h3 className="font-bold text-xl mb-4">Add Recruiting Note</h3>
                        <Textarea
                          placeholder="Add recruiting notes, call summaries, or observations..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="mb-3"
                          rows={4}
                        />
                        <Button onClick={handleAddNote} className="bg-[#03154C] hover:bg-[#012ECD]">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </div>

                      {/* Notes List */}
                      {notes.length > 0 && (
                        <div className="bg-muted rounded-lg p-6">
                          <h3 className="font-bold text-xl mb-4">All Notes ({notes.length})</h3>
                          <div className="space-y-3">
                            {notes.map((note) => (
                              <div key={note.id} className="bg-background rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {note.note_type || "General"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(note.created_at).toLocaleDateString()} at{" "}
                                    {new Date(note.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed">{note.note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddProspectModal} onOpenChange={setShowAddProspectModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#0D1A4D]">
                  Add Prospect to Recruiting Funnel
                </DialogTitle>
                <DialogDescription>Search for athletes and add them to your recruiting pipeline</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name..."
                      value={prospectSearchQuery}
                      onChange={(e) => setProspectSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchProspects()}
                      className="pl-10"
                    />
                  </div>

                  <Select value={prospectGradYearFilter} onValueChange={setProspectGradYearFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Grad Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grad Years</SelectItem>
                      <SelectItem value="2025">Class of 2025</SelectItem>
                      <SelectItem value="2026">Class of 2026</SelectItem>
                      <SelectItem value="2027">Class of 2027</SelectItem>
                      <SelectItem value="2028">Class of 2028</SelectItem>
                      <SelectItem value="2029">Class of 2029</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={prospectWeightFilter} onValueChange={setProspectWeightFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Weights" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Weights</SelectItem>
                      <SelectItem value="106">106 lbs</SelectItem>
                      <SelectItem value="113">113 lbs</SelectItem>
                      <SelectItem value="120">120 lbs</SelectItem>
                      <SelectItem value="126">126 lbs</SelectItem>
                      <SelectItem value="132">132 lbs</SelectItem>
                      <SelectItem value="138">138 lbs</SelectItem>
                      <SelectItem value="144">144 lbs</SelectItem>
                      <SelectItem value="150">150 lbs</SelectItem>
                      <SelectItem value="157">157 lbs</SelectItem>
                      <SelectItem value="165">165 lbs</SelectItem>
                      <SelectItem value="175">175 lbs</SelectItem>
                      <SelectItem value="190">190 lbs</SelectItem>
                      <SelectItem value="215">215 lbs</SelectItem>
                      <SelectItem value="285">285 lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={searchProspects} disabled={isSearchingProspects} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  {isSearchingProspects ? "Searching..." : "Search Prospects"}
                </Button>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {prospectSearchResults.length === 0 && !isSearchingProspects && (
                    <p className="text-center text-gray-500 py-8">
                      {prospectSearchQuery || prospectGradYearFilter !== "all" || prospectWeightFilter !== "all"
                        ? "No prospects found. Try adjusting your search criteria."
                        : "Enter search criteria to find prospects"}
                    </p>
                  )}

                  {prospectSearchResults.map((prospect) => (
                    <Card key={prospect.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#D3B574] to-[#CBAF5D] flex items-center justify-center text-white font-bold shadow-md">
                              {prospect.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <h3 className="font-semibold text-[#0D1A4D]">{prospect.name}</h3>
                              <p className="text-sm text-gray-600">
                                {prospect.highschool} • Class of {prospect.graduationyear} • {prospect.weightclass}
                              </p>
                              {prospect.ranking && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Ranked #{prospect.ranking}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => addProspectToFunnel(prospect.id)}
                            size="sm"
                            className="bg-[#D3B574] hover:bg-[#CBAF5D] text-white"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
