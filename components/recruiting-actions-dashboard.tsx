"use client"

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Clock, AlertCircle, TableIcon, LayoutDashboard, ChevronLeft, ChevronRight, Edit, X, Check, Plus, Cake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

interface RecruitingAction {
  id: string
  action_type: string
  action_date: string
  follow_up_date: string | null
  description: string
  outcome: string | null
  athlete_id: string
  coach_user_id: string
  athlete_name: string
  athlete_photo: string
  coach_name: string
}

interface AthleteWithBirthday {
  id: string
  name: string
  birthdate?: string
  photourl?: string
  graduationyear?: number
  weightclass?: string
}

interface RecruitingActionsDashboardProps {
  schoolId?: string
  athletes?: { id: string; name: string }[] // Optional: pass athletes from parent (e.g., prospects from portal)
  prospects?: AthleteWithBirthday[] // Optional: pass full prospects with birthdates
  onViewChange?: (view: "dashboard" | "calendar" | "activity") => void
}

export interface RecruitingActionsDashboardRef {
  openCreateActivity: () => void
}

export const RecruitingActionsDashboard = forwardRef<RecruitingActionsDashboardRef, RecruitingActionsDashboardProps>(
  ({ schoolId, athletes: providedAthletes, prospects, onViewChange }, ref) => {
  const [actions, setActions] = useState<RecruitingAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{ date: Date; activities: RecruitingAction[] } | null>(null)
  const [editingAction, setEditingAction] = useState<RecruitingAction | null>(null)
  const [editFormData, setEditFormData] = useState({
    actionType: "",
    actionDate: "",
    followUpDate: "",
    description: "",
    outcome: "",
  })
  const [creatingActivity, setCreatingActivity] = useState(false)
  const [newActivityForm, setNewActivityForm] = useState({
    athleteId: "",
    actionType: "",
    actionDate: "",
    followUpDate: "",
    description: "",
    outcome: "",
  })
  const [availableAthletes, setAvailableAthletes] = useState<{ id: string; name: string }[]>([])
  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState<string>("all")
  const [selectedCoachFilter, setSelectedCoachFilter] = useState<string>("all")
  const [tabValue, setTabValue] = useState<"dashboard" | "calendar" | "activity">("dashboard")

  // Expose method to parent component to open the create activity modal
  useImperativeHandle(ref, () => ({
    openCreateActivity: () => {
      setCreatingActivity(true)
    }
  }))

  useEffect(() => {
    console.log("[v0] RecruitingActionsDashboard mounted with schoolId:", schoolId)
    console.log("[v0] Dashboard received prospects:", prospects?.length || 0)
    if (prospects && prospects.length > 0) {
      console.log("[v0] Dashboard - Prospects with birthdates:", prospects.filter(p => p.birthdate).map(p => ({ name: p.name, birthdate: p.birthdate })))
    }
    fetchActions()
    
    // If athletes are provided as prop, use those; otherwise fetch
    if (providedAthletes && providedAthletes.length > 0) {
      console.log("[v0] Using provided athletes:", providedAthletes.length)
      setAvailableAthletes(providedAthletes)
    } else {
      fetchAthletes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, providedAthletes, prospects])

  useEffect(() => {
    onViewChange?.(tabValue)
  }, [tabValue, onViewChange])

  const fetchAthletes = async () => {
    // Skip if we're using schoolId - athletes for school portals come from prospects API
    // The starred-athletes API requires a school_id on the profile, which admins don't have
    if (schoolId && typeof schoolId === "string" && schoolId.trim().length > 0) {
      console.log("[v0] Skipping starred-athletes fetch - using schoolId, athletes will come from prospects")
      return
    }
    
    try {
      const response = await fetch("/api/coaches/starred-athletes")
      if (response.ok) {
        const data = await response.json()
        const athletes = (data.athletes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
        }))
        setAvailableAthletes(athletes)
      } else {
        // Silently fail - this is OK for admins or when schoolId is used
        console.log("[v0] starred-athletes fetch failed (this is OK for admins or school portals):", response.status)
      }
    } catch (error) {
      // Silently fail - this is OK for admins or when schoolId is used
      console.log("[v0] Error fetching athletes (this is OK for admins or school portals):", error)
    }
  }

  const fetchActions = async () => {
    try {
      let url = ""
      // Only use schoolId if it's a non-empty string
      if (schoolId && typeof schoolId === "string" && schoolId.trim().length > 0) {
        console.log("[v0] Fetching actions for schoolId:", schoolId)
        url = `/api/coach-portal/activities?schoolId=${encodeURIComponent(schoolId)}`
      } else {
        console.log("[v0] Fetching actions for current coach")
        url = `/api/coaches/all-actions`
      }
      
      const response = await fetch(url)
      console.log("[v0] Fetch response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Received data:", data)
        // Handle both response formats: { activities: [] } and { actions: [] }
        const activities = data.activities || data.actions || []
        console.log("[v0] Activities count:", activities.length)
        setActions(activities)
      } else {
        console.error("[v0] Fetch failed with status:", response.status)
        const errorText = await response.text()
        console.error("[v0] Error response:", errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching actions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const athleteFilterOptions = useMemo(() => {
    const unique = new Map<string, string>()
    actions.forEach((action) => {
      if (action.athlete_id && action.athlete_name) {
        unique.set(action.athlete_id, action.athlete_name)
      }
    })
    return Array.from(unique.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [actions])

const coachFilterOptions = useMemo(() => {
  const unique = new Map<string, string>()
  actions.forEach((action) => {
    if (action.coach_user_id && action.coach_name) {
      unique.set(action.coach_user_id, action.coach_name)
    }
  })
  return Array.from(unique.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}, [actions])

  const filteredActions = useMemo(() => {
    if (selectedAthleteFilter === "all") {
    return selectedCoachFilter === "all"
      ? actions
      : actions.filter((action) => action.coach_user_id === selectedCoachFilter)
    }
  return actions.filter((action) => {
    const matchesAthlete = action.athlete_id === selectedAthleteFilter
    const matchesCoach = selectedCoachFilter === "all" || action.coach_user_id === selectedCoachFilter
    return matchesAthlete && matchesCoach
  })
}, [actions, selectedAthleteFilter, selectedCoachFilter])

  const normalizeActionType = (type?: string | null) => {
    const value = (type || "other").toLowerCase()
    switch (value) {
      case "phone_call":
      case "call":
        return "call"
      case "text_message":
      case "text":
        return "text"
      case "email":
        return "email"
      case "official_visit":
      case "visit":
        return "visit"
      case "prospect_camp":
      case "camp":
        return "prospect_camp"
      case "watched_live":
      case "watched":
        return "watched_live"
      case "letter":
      case "handwritten_letter":
        return "letter"
      case "social_media":
      case "dm":
        return "social_media"
      default:
        return value || "other"
    }
  }

const activityTrendData = useMemo(() => {
    const daysToShow = 14
    const today = new Date()
    today.setHours(0, 0, 0, 0)

  const dateBuckets = new Map<
    string,
    {
      total: number
      [key: string]: number
    }
  >()
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const key = date.toISOString().split("T")[0]
    dateBuckets.set(key, { total: 0 })
    }

  actions.forEach((action) => {
      const rawDate = action.action_date || action.follow_up_date
      if (!rawDate) return
      const normalized = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate
    const bucket = dateBuckets.get(normalized)
    if (!bucket) return
    bucket.total += 1
    const key = normalizeActionType(action.action_type)
    bucket[key] = (bucket[key] || 0) + 1
    })

  return Array.from(dateBuckets.entries()).map(([key, bucket]) => {
      const date = new Date(`${key}T00:00:00`)
    const formatted: Record<string, number | string> = {
        fullDate: key,
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: bucket.total,
      }
    Object.entries(bucket).forEach(([type, value]) => {
      if (type === "total") return
      formatted[type] = value
    })
    return formatted
    })
  }, [actions])

  const activityTypes = useMemo(() => {
  const set = new Set<string>()
  actions.forEach((action) => {
    if (action.action_type) {
      set.add(normalizeActionType(action.action_type))
    }
  })
  return Array.from(set)
}, [actions])

  // Create birthday "events" from prospects
  const getBirthdayEvents = () => {
    if (!prospects) {
      return []
    }

    // Get today's date in local timezone (EST)
    const now = new Date()
    const currentYear = now.getFullYear()
    // Create today at midnight in local timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)
    
    console.log("[v0] Today (local):", today.toISOString(), "Date:", today.getDate(), "Month:", today.getMonth() + 1)
    
    const birthdayEvents = prospects
      .filter((p) => !!p.birthdate)
      .map(prospect => {
        try {
          // Parse birthdate as local date to avoid timezone issues
          const dateStr = prospect.birthdate!.includes('T') 
            ? prospect.birthdate!.split('T')[0] 
            : prospect.birthdate!
          const [year, month, day] = dateStr.split('-').map(Number)
          
          // Create this year's birthday in local timezone
          const thisYearBirthday = new Date(currentYear, month - 1, day)
          thisYearBirthday.setHours(0, 0, 0, 0)
          
          // Create next year's birthday in local timezone
          const nextYearBirthday = new Date(currentYear + 1, month - 1, day)
          nextYearBirthday.setHours(0, 0, 0, 0)
          
          // If birthday already passed this year, use next year
          const birthday = thisYearBirthday < today 
            ? nextYearBirthday
            : thisYearBirthday
          
          // Format as YYYY-MM-DD in local timezone (no time component)
          const birthdayStr = `${birthday.getFullYear()}-${String(birthday.getMonth() + 1).padStart(2, '0')}-${String(birthday.getDate()).padStart(2, '0')}`
          
          const event = {
            id: `birthday-${prospect.id}`,
            action_type: "birthday",
            action_date: birthdayStr,
            follow_up_date: birthdayStr,
            description: `${prospect.name}'s Birthday`,
            outcome: null,
            athlete_id: prospect.id,
            coach_user_id: "",
            athlete_name: prospect.name,
            athlete_photo: prospect.photourl || "",
            coach_name: "",
          } as RecruitingAction
          return event
        } catch (e) {
          return null
        }
      })
      .filter((e): e is RecruitingAction => e !== null)
    return birthdayEvents
  }

  const categorizeActions = () => {
    // Get today's date in local timezone (EST)
    const now = new Date()
    // Normalize today to midnight in local timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)

    // Calculate end of current month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
    endOfMonth.setHours(23, 59, 59, 999)

    const todayActions: RecruitingAction[] = []
    const upcomingActions: RecruitingAction[] = []
    const overdueActions: RecruitingAction[] = []
    const needsFollowUpDate: RecruitingAction[] = []

    // Get birthday events
    const birthdayEvents = getBirthdayEvents()
    const allEvents = [...actions, ...birthdayEvents]

    allEvents.forEach((action) => {
      // If action has a follow_up_date, categorize by that date
      if (action.follow_up_date) {
        // Parse the date string as local date (YYYY-MM-DD format)
        const dateStr = action.follow_up_date.includes('T') 
          ? action.follow_up_date.split('T')[0] 
          : action.follow_up_date
        const [year, month, day] = dateStr.split('-').map(Number)
        
        // Create date in local timezone
        const actionDate = new Date(year, month - 1, day)
        actionDate.setHours(0, 0, 0, 0)

        const daysDiff = Math.floor((actionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff < 0) {
          overdueActions.push(action)
        } else if (daysDiff === 0) {
          todayActions.push(action)
        } else if (actionDate <= endOfMonth) {
          // Only show upcoming events that are within this month
          upcomingActions.push(action)
        }
        // Events beyond this month are not shown in upcoming
      } else {
        // Actions without follow_up_date are typically logged history items.
        // Track them for analytics, but don't surface them in Upcoming/Todays dashboard buckets.
        needsFollowUpDate.push(action)
      }
    })

    return { todayActions, upcomingActions, overdueActions }
  }

  const { todayActions, upcomingActions, overdueActions } = categorizeActions()

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getActivitiesForDate = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateToCheck = new Date(year, month, day)
    dateToCheck.setHours(0, 0, 0, 0)

    const birthdayEvents = getBirthdayEvents()
    const allEvents = [...actions, ...birthdayEvents]

    return allEvents.filter((action) => {
      // Check both follow_up_date and action_date for calendar display
      let dateToCompare: Date | null = null
      
      if (action.follow_up_date) {
        // Parse date string as local date to avoid timezone issues
        const dateStr = action.follow_up_date.includes('T') 
          ? action.follow_up_date.split('T')[0] 
          : action.follow_up_date
        const [y, m, d] = dateStr.split('-').map(Number)
        dateToCompare = new Date(y, m - 1, d)
        dateToCompare.setHours(0, 0, 0, 0)
      } else if (action.action_date) {
        // If no follow_up_date, use action_date so actions appear on calendar
        const dateStr = action.action_date.includes('T') 
          ? action.action_date.split('T')[0] 
          : action.action_date
        const [y, m, d] = dateStr.split('-').map(Number)
        dateToCompare = new Date(y, m - 1, d)
        dateToCompare.setHours(0, 0, 0, 0)
      }
      
      if (!dateToCompare) return false
      
      dateToCompare.setHours(0, 0, 0, 0)
      
      return dateToCompare.getTime() === dateToCheck.getTime()
    })
  }

  const formatActionType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    // Parse date string as local date to avoid timezone issues
    const dateStr = dateString.includes('T') 
      ? dateString.split('T')[0] 
      : dateString
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const clickedDate = new Date(year, month, day)
    const dayActivities = getActivitiesForDate(day)

    // Always open day detail modal, even if no activities
    setSelectedDay({ date: clickedDate, activities: dayActivities })
  }

  const getActivityColor = (actionType: string) => {
    const key = normalizeActionType(actionType)
    const colors: Record<string, { bg: string; text: string; border: string; fill: string }> = {
      call: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", fill: "rgba(59,130,246,0.85)" },
      text: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", fill: "rgba(124,58,237,0.75)" },
      email: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", fill: "rgba(34,197,94,0.75)" },
      visit: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", fill: "rgba(249,115,22,0.75)" },
      prospect_camp: { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-200", fill: "rgba(245,158,11,0.75)" },
      watched_live: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200", fill: "rgba(56,189,248,0.75)" },
      letter: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200", fill: "rgba(244,114,182,0.75)" },
      social_media: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200", fill: "rgba(99,102,241,0.75)" },
      other: { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-300", fill: "rgba(148,163,184,0.75)" },
    }
    return colors[key] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", fill: "rgba(148,163,184,0.6)" }
  }

  const handleComplete = async (actionId: string) => {
    try {
      const action = actions.find(a => a.id === actionId)
      if (!action) return

      const response = await fetch("/api/coach-portal/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: actionId,
          actionType: action.action_type,
          actionDate: action.action_date,
          followUpDate: action.follow_up_date || null,
          description: action.description,
          outcome: "Completed",
        }),
      })

      if (response.ok) {
        fetchActions() // Refresh actions
      }
    } catch (error) {
      console.error("Error completing action:", error)
    }
  }

  const handleDelete = async (actionId: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return

    try {
      const response = await fetch(`/api/coach-portal/activities?activityId=${actionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchActions() // Refresh actions
      }
    } catch (error) {
      console.error("Error deleting action:", error)
    }
  }

  const handleEdit = (action: RecruitingAction) => {
    setEditingAction(action)
    setEditFormData({
      actionType: action.action_type,
      actionDate: action.action_date.split("T")[0],
      followUpDate: action.follow_up_date ? action.follow_up_date.split("T")[0] : "",
      description: action.description || "",
      outcome: action.outcome || "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAction) return

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: editingAction.id,
          actionType: editFormData.actionType,
          actionDate: editFormData.actionDate,
          followUpDate: editFormData.followUpDate || null,
          description: editFormData.description,
          outcome: editFormData.outcome || null,
        }),
      })

      if (response.ok) {
        setEditingAction(null)
        fetchActions() // Refresh actions
      }
    } catch (error) {
      console.error("Error updating action:", error)
    }
  }

  const isCompleted = (action: RecruitingAction) => {
    return action.outcome?.toLowerCase() === "completed"
  }

  const handleCreateActivity = () => {
    const today = new Date().toISOString().split("T")[0]
    setNewActivityForm({
      athleteId: "",
      actionType: "",
      actionDate: today,
      followUpDate: "",
      description: "",
      outcome: "",
    })
    setCreatingActivity(true)
  }

  const handleSaveNewActivity = async () => {
    if (!newActivityForm.athleteId || !newActivityForm.actionType || !newActivityForm.actionDate) {
      alert("Please fill in athlete, activity type, and action date")
      return
    }

    try {
      const response = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: newActivityForm.athleteId,
          activityType: newActivityForm.actionType,
          activityDate: newActivityForm.actionDate,
          notes: newActivityForm.description,
          outcome: newActivityForm.outcome || null,
          followUpDate: newActivityForm.followUpDate || null,
        }),
      })

      if (response.ok) {
        setCreatingActivity(false)
        fetchActions() // Refresh activities
      }
    } catch (error) {
      console.error("Error creating activity:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <Tabs
        value={tabValue}
        onValueChange={(value) => {
          const next = (value as "dashboard" | "calendar" | "activity") || "dashboard"
          setTabValue(next)
        }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center justify-center flex-1">
            <TabsList className="bg-card border border-border transition-colors">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2 hidden md:flex">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <TableIcon className="h-4 w-4" />
                Activity
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

        {/* Dashboard Tab - Today's Follow-ups, Upcoming, Overdue */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today's Events */}
            <Card className="border border-blue-200/60 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/40 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Today's Events
                  <Badge variant="secondary" className="ml-auto bg-blue-600 text-white">
                    {todayActions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events scheduled for today</p>
                ) : (
                  <div className="space-y-3">
                    {todayActions.map((action) => {
                      const isBirthday = action.action_type === "birthday"
                      return (
                        <div
                          key={action.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isCompleted(action)
                              ? 'bg-card border-border opacity-60 dark:border-border/40'
                              : isBirthday
                                ? 'border-pink-200 bg-pink-50 dark:border-pink-400/60 dark:bg-pink-500/10'
                                : 'bg-card border-blue-100 dark:bg-blue-500/10 dark:border-blue-400/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!isBirthday && (
                              <Checkbox
                                checked={isCompleted(action)}
                                onCheckedChange={() => handleComplete(action.id)}
                                className="mt-1"
                              />
                            )}
                            {isBirthday ? (
                              <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center flex-shrink-0">
                                <Cake className="h-5 w-5 text-pink-600" />
                              </div>
                            ) : (
                              <img
                                src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                                alt={action.athlete_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isCompleted(action) ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}>
                                {action.athlete_name}
                              </p>
                              <p className={`text-xs ${isBirthday ? 'text-pink-600 font-semibold' : 'text-muted-foreground'}`}>
                                {isBirthday ? '🎂 Birthday' : formatActionType(action.action_type)}
                              </p>
                              {action.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                              )}
                            </div>
                            {!isBirthday && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleEdit(action)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => handleDelete(action.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="border border-green-200/60 bg-green-50 dark:bg-green-500/10 dark:border-green-500/40 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                  Upcoming
                  <Badge variant="secondary" className="ml-auto bg-green-600 text-white">
                    {upcomingActions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming follow-ups</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingActions.slice(0, 5).map((action) => {
                      const isBirthday = action.action_type === "birthday"
                      return (
                        <div
                          key={action.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isCompleted(action)
                              ? 'bg-card border-border opacity-60 dark:border-border/40'
                              : isBirthday
                                ? 'border-pink-200 bg-pink-50 dark:border-pink-400/60 dark:bg-pink-500/10'
                                : 'bg-card border-green-100 dark:bg-green-500/10 dark:border-green-500/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!isBirthday && (
                              <Checkbox
                                checked={isCompleted(action)}
                                onCheckedChange={() => handleComplete(action.id)}
                                className="mt-1"
                              />
                            )}
                            {isBirthday ? (
                              <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center flex-shrink-0">
                                <Cake className="h-5 w-5 text-pink-600" />
                              </div>
                            ) : (
                              <img
                                src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                                alt={action.athlete_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isCompleted(action) ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}>
                                {action.athlete_name}
                              </p>
                              <p className={`text-xs ${isBirthday ? 'text-pink-600 font-semibold' : 'text-muted-foreground'}`}>
                                {isBirthday ? '🎂 Birthday' : formatActionType(action.action_type)}
                              </p>
                              <p className={`text-xs font-medium mt-1 ${action.follow_up_date ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {action.follow_up_date ? formatDate(action.follow_up_date) : formatDate(action.action_date)}
                              </p>
                            </div>
                            {!isBirthday && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleEdit(action)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => handleDelete(action.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue */}
            <Card className="border border-red-200/60 bg-red-50 dark:bg-red-500/10 dark:border-red-500/40 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Overdue
                  <Badge variant="secondary" className="ml-auto bg-red-600 text-white">
                    {overdueActions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overdue actions</p>
                ) : (
                  <div className="space-y-3">
                    {overdueActions.map((action) => (
                      <div
                        key={action.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isCompleted(action)
                            ? 'bg-card border-border opacity-60 dark:border-border/40'
                            : 'bg-card border-red-100 dark:bg-red-500/10 dark:border-red-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isCompleted(action)}
                            onCheckedChange={() => handleComplete(action.id)}
                            className="mt-1"
                          />
                          <img
                            src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                            alt={action.athlete_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isCompleted(action) ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}>
                              {action.athlete_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatActionType(action.action_type)}</p>
                            <p className="text-xs text-red-600 font-medium mt-1">
                              {formatDate(action.follow_up_date!)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEdit(action)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(action.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar Tab - Visual month calendar */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-xl">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {dayNames.map((day) => (
                  <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {generateCalendarDays().map((day, index) => {
                  const dayActivities = day ? getActivitiesForDate(day) : []
                  const isToday =
                    day &&
                    new Date().getDate() === day &&
                    new Date().getMonth() === currentDate.getMonth() &&
                    new Date().getFullYear() === currentDate.getFullYear()

                  return (
                    <div
                      key={index}
                      onClick={() => day && handleDayClick(day)}
                      className={`min-h-[80px] p-2 border rounded-lg relative ${
                        day ? "bg-card hover:bg-muted cursor-pointer" : "bg-muted"
                      } ${isToday ? "border-blue-500 border-2" : "border-border"} ${
                        dayActivities.length > 0 ? "hover:shadow-md transition-shadow" : ""
                      }`}
                    >
                      {day && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <div className={`text-sm font-medium ${isToday ? "text-blue-600" : "text-foreground"}`}>
                              {day}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const year = currentDate.getFullYear()
                                const month = currentDate.getMonth()
                                const clickedDate = new Date(year, month, day)
                                setNewActivity({
                                  ...newActivity,
                                  actionDate: clickedDate.toISOString().split('T')[0],
                                })
                                setShowCreateDialog(true)
                              }}
                              className="h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                              title="Add activity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          {dayActivities.length > 0 && (
                            <div className="space-y-1">
                              {dayActivities.slice(0, 2).map((activity) => {
                                const isBirthday = activity.action_type === "birthday"
                                const colors = isBirthday 
                                  ? { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" }
                                  : getActivityColor(activity.action_type)
                                return (
                                  <div
                                    key={activity.id}
                                    className={`text-xs ${colors.bg} ${colors.text} px-2 py-1 rounded truncate border ${colors.border} flex items-center gap-1`}
                                    title={`${activity.athlete_name} - ${isBirthday ? '🎂 Birthday' : formatActionType(activity.action_type)}`}
                                  >
                                    {isBirthday && <Cake className="h-3 w-3" />}
                                    {activity.athlete_name}
                                  </div>
                                )
                              })}
                              {dayActivities.length > 2 && (
                                <div className="text-xs text-muted-foreground px-2">+{dayActivities.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Tab - List view */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <p className="text-sm text-muted-foreground">Review team outreach or drill into a single athlete.</p>
            </CardHeader>
            <CardContent>
              {activityTrendData.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">Activity volume (last 14 days)</h4>
                    <span className="text-xs font-medium text-muted-foreground">
                      {activityTrendData.reduce((sum, point) => sum + (Number(point.total) || 0), 0)} total logs
                    </span>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number, key: string) => [
                            `${value} ${key === "total" ? "activities" : formatActionType(key)}`,
                            key === "total" ? "Total" : formatActionType(key),
                          ]}
                          labelFormatter={(label) => label}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "0.75rem",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === "total" ? "Total" : formatActionType(value))}
                          iconType="circle"
                        />
                        {activityTypes.map((type) => (
                          <Bar key={type} dataKey={type} stackId="activity" fill={getActivityColor(type).fill} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  {athleteFilterOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="activity-athlete-filter" className="text-sm font-medium text-muted-foreground">
                        Athlete
                      </Label>
                      <Select value={selectedAthleteFilter} onValueChange={setSelectedAthleteFilter}>
                        <SelectTrigger id="activity-athlete-filter" className="w-[200px]">
                          <SelectValue placeholder="All athletes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All athletes</SelectItem>
                          {athleteFilterOptions.map((athlete) => (
                            <SelectItem key={athlete.id} value={athlete.id}>
                              {athlete.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {coachFilterOptions.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="activity-coach-filter" className="text-sm font-medium text-muted-foreground">
                        Coach
                      </Label>
                      <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                        <SelectTrigger id="activity-coach-filter" className="w-[200px]">
                          <SelectValue placeholder="All coaches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All coaches</SelectItem>
                          {coachFilterOptions.map((coach) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {(selectedAthleteFilter !== "all" || selectedCoachFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start md:self-auto"
                    onClick={() => {
                      setSelectedAthleteFilter("all")
                      setSelectedCoachFilter("all")
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
              {filteredActions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {selectedAthleteFilter === "all"
                    ? "No activities logged yet."
                    : "No activities logged for this athlete yet."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Athlete</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Coach</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Activity Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Follow-up</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActions.map((action) => (
                        <tr key={action.id} className={`border-b border-border hover:bg-muted ${isCompleted(action) ? 'opacity-60' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isCompleted(action)}
                                onCheckedChange={() => handleComplete(action.id)}
                              />
                              <img
                                src={action.athlete_photo || "/placeholder.svg?height=32&width=32"}
                                alt={action.athlete_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span className={`font-medium text-sm ${isCompleted(action) ? 'text-muted-foreground/70 line-through' : ''}`}>{action.athlete_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{action.coach_name}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{formatActionType(action.action_type)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(action.action_date)}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {action.follow_up_date ? formatDate(action.follow_up_date) : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                            {action.description || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(action)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(action.id)}
                              >
                                <X className="h-4 w-4" />
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
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                {selectedDay &&
                  selectedDay.date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
              </DialogTitle>
              <Button
                size="sm"
                onClick={() => {
                  if (selectedDay) {
                    setNewActivity({
                      ...newActivity,
                      actionDate: selectedDay.date.toISOString().split('T')[0],
                    })
                    setShowCreateDialog(true)
                    setSelectedDay(null)
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Activity
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedDay?.activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="mb-2">No activities scheduled for this day</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedDay) {
                      setNewActivity({
                        ...newActivity,
                        actionDate: selectedDay.date.toISOString().split('T')[0],
                      })
                      setShowCreateDialog(true)
                      setSelectedDay(null)
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Activity
                </Button>
              </div>
            ) : (
              selectedDay?.activities.map((activity) => {
                const colors = getActivityColor(activity.action_type)
                return (
                  <Card key={activity.id} className={`border border-border transition-colors ${isCompleted(activity) ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isCompleted(activity)}
                          onCheckedChange={() => handleComplete(activity.id)}
                          className="mt-1"
                        />
                        <img
                          src={activity.athlete_photo || "/placeholder.svg?height=48&width=48"}
                          alt={activity.athlete_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className={`font-semibold ${isCompleted(activity) ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}>{activity.athlete_name}</h4>
                              <p className="text-sm text-muted-foreground">{activity.coach_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${colors.bg} ${colors.text} border-0`}>
                                {formatActionType(activity.action_type)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEdit(activity)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(activity.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {activity.description && <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>}
                          {activity.outcome && (
                            <div className="text-sm">
                              <span className="font-medium text-muted-foreground">Outcome: </span>
                              <span className="text-muted-foreground">{activity.outcome}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">Logged: {formatDate(activity.action_date)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingAction} onOpenChange={(open) => !open && setEditingAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="actionType">Activity Type</Label>
              <Select value={editFormData.actionType} onValueChange={(value) => setEditFormData({ ...editFormData, actionType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="text_message">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="campus_visit">Campus Visit</SelectItem>
                  <SelectItem value="tournament_visit">Tournament Visit</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                  <SelectItem value="offer_extended">Offer Extended</SelectItem>
                  <SelectItem value="scholarship_discussion">Scholarship Discussion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="actionDate">Action Date</Label>
              <Input
                id="actionDate"
                type="date"
                value={editFormData.actionDate}
                onChange={(e) => setEditFormData({ ...editFormData, actionDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
              <Input
                id="followUpDate"
                type="date"
                value={editFormData.followUpDate}
                onChange={(e) => setEditFormData({ ...editFormData, followUpDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                placeholder="Enter description..."
              />
            </div>
            <div>
              <Label htmlFor="outcome">Outcome (Optional)</Label>
              <Input
                id="outcome"
                value={editFormData.outcome}
                onChange={(e) => setEditFormData({ ...editFormData, outcome: e.target.value })}
                placeholder="e.g., Completed, No response, etc."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingAction(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Activity Dialog */}
      <Dialog open={creatingActivity} onOpenChange={(open) => !open && setCreatingActivity(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="newAthlete">Athlete *</Label>
              <Select value={newActivityForm.athleteId} onValueChange={(value) => setNewActivityForm({ ...newActivityForm, athleteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {availableAthletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </SelectItem>
                  ))}
                  {availableAthletes.length === 0 && (
                    <SelectItem value="no-athletes" disabled>No athletes available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newActionType">Activity Type *</Label>
              <Select value={newActivityForm.actionType} onValueChange={(value) => setNewActivityForm({ ...newActivityForm, actionType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="text_message">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="campus_visit">Campus Visit</SelectItem>
                  <SelectItem value="tournament_visit">Tournament Visit</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                  <SelectItem value="offer_extended">Offer Extended</SelectItem>
                  <SelectItem value="scholarship_discussion">Scholarship Discussion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newActionDate">Action Date *</Label>
              <Input
                id="newActionDate"
                type="date"
                value={newActivityForm.actionDate}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, actionDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="newFollowUpDate">Follow-up Date (Optional)</Label>
              <Input
                id="newFollowUpDate"
                type="date"
                value={newActivityForm.followUpDate}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, followUpDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="newDescription">Description</Label>
              <Textarea
                id="newDescription"
                value={newActivityForm.description}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, description: e.target.value })}
                rows={3}
                placeholder="Enter description..."
              />
            </div>
            <div>
              <Label htmlFor="newOutcome">Outcome (Optional)</Label>
              <Input
                id="newOutcome"
                value={newActivityForm.outcome}
                onChange={(e) => setNewActivityForm({ ...newActivityForm, outcome: e.target.value })}
                placeholder="e.g., Completed, No response, etc."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreatingActivity(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNewActivity}>Create Activity</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

RecruitingActionsDashboard.displayName = "RecruitingActionsDashboard"
