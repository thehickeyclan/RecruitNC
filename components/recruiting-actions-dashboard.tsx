"use client"

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Clock, AlertCircle, TableIcon, LayoutDashboard, ChevronLeft, ChevronRight, Edit, X, Check, Plus, Cake, Sparkles, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const DEFAULT_BRAND_COLOR = "#0b1728"

const hexToRgb = (hex: string) => {
  const sanitized = hex.replace("#", "")
  if (sanitized.length !== 6) return null
  const bigint = Number.parseInt(sanitized, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

const rgbaFromHex = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(37, 99, 235, ${alpha})` // fallback blue
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

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
  pipeline_stage?: string | null
  star_rating?: number | null
}

interface RecruitingActionsDashboardProps {
  schoolId?: string
  athletes?: { id: string; name: string }[] // Optional: pass athletes from parent (e.g., prospects from portal)
  prospects?: AthleteWithBirthday[] // Optional: pass full prospects with birthdates
  onViewChange?: (view: "dashboard" | "calendar" | "activity") => void
  brandColor?: string
}

export interface RecruitingActionsDashboardRef {
  openCreateActivity: () => void
}

const ACTIVITY_EMOJI_MAP: Record<string, string> = {
  call: "📞",
  phone_call: "📞",
  text: "💬",
  text_message: "💬",
  email: "📧",
  visit: "🏛️",
  campus_visit: "🏛️",
  prospect_camp: "🏕️",
  watched_live: "👀",
  letter: "✍️",
  social_media: "📱",
  other: "📝",
}

const ACTION_TYPE_TO_FORM_VALUE: Record<string, string> = {
  call: "phone_call",
  phone_call: "phone_call",
  text: "text_message",
  text_message: "text_message",
  email: "email",
  visit: "campus_visit",
  campus_visit: "campus_visit",
  prospect_camp: "prospect_camp",
  watched_live: "watched_live",
  letter: "letter",
  social_media: "social_media",
  other: "other",
}

const getCoachInitials = (name?: string | null) => {
  if (!name) return ""
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
  return initials.slice(0, 2)
}

export const RecruitingActionsDashboard = forwardRef<RecruitingActionsDashboardRef, RecruitingActionsDashboardProps>(
  ({ schoolId, athletes: providedAthletes, prospects, onViewChange, brandColor }, ref) => {
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
  const [insightMode, setInsightMode] = useState<"athletes" | "stage">("athletes")
  const [selectedStarFilter, setSelectedStarFilter] = useState<string>("all")
  const [showUntouchedOnly, setShowUntouchedOnly] = useState<boolean>(false)
  const resolvedBrandColor = brandColor || DEFAULT_BRAND_COLOR

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

  const starRatingByAthlete = useMemo(() => {
    const map = new Map<string, number | null>()
    ;(prospects || []).forEach((prospect) => {
      map.set(prospect.id, prospect.star_rating ?? null)
    })
    return map
  }, [prospects])

  const cadenceDetailByAthlete = useMemo(() => {
    const map = new Map<string, any>()
    cadenceStats.details.forEach((detail) => map.set(detail.id, detail))
    return map
  }, [cadenceStats])

  const filteredActions = useMemo(() => {
    let result = actions

    if (selectedAthleteFilter !== "all") {
      result = result.filter((action) => action.athlete_id === selectedAthleteFilter)
    }

    if (selectedCoachFilter !== "all") {
      result = result.filter((action) => action.coach_user_id === selectedCoachFilter)
    }

    if (selectedStarFilter !== "all") {
      result = result.filter((action) => {
        const rating = starRatingByAthlete.get(action.athlete_id) ?? null
        if (selectedStarFilter === "unrated") return rating === null
        return rating === Number(selectedStarFilter)
      })
    }

    if (showUntouchedOnly) {
      return []
    }

    return result
  }, [actions, selectedAthleteFilter, selectedCoachFilter, selectedStarFilter, showUntouchedOnly, starRatingByAthlete])

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
    return Array.from(set).filter((type) => type !== "birthday")
  }, [actions])

  const cadenceStats = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()

    const thresholdForYear = (graduationYear?: number | null) => {
      if (!graduationYear) return 28
      const yearsOut = graduationYear - currentYear
      if (yearsOut <= 1) return 21
      if (yearsOut === 2) return 28
      if (yearsOut === 3) return 35
      return 42
    }

    const lastTouchMap = new Map<string, Date>()
    actions.forEach((action) => {
      const date = new Date(action.action_date)
      if (Number.isNaN(date.getTime())) return
      const previous = lastTouchMap.get(action.athlete_id)
      if (!previous || date > previous) {
        lastTouchMap.set(action.athlete_id, date)
      }
    })

    const details =
      prospects?.map((prospect) => {
        const lastTouch = lastTouchMap.get(prospect.id) || null
        const threshold = thresholdForYear(prospect.graduationyear)
        let status: "noActivity" | "overdue" | "warning" | "onTrack" = "noActivity"
        let daysSince: number | null = null
        if (lastTouch) {
          daysSince = Math.floor((now.getTime() - lastTouch.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSince > threshold) {
            status = "overdue"
          } else if (daysSince > threshold * 0.6) {
            status = "warning"
          } else {
            status = "onTrack"
          }
        }

        return {
          id: prospect.id,
          name: prospect.name,
          graduationYear: prospect.graduationyear ?? null,
          starRating: prospect.star_rating ?? null,
          stage: normalizeStage(prospect.pipeline_stage),
          lastTouch,
          daysSince,
          status,
          threshold,
        }
      }) ?? []

    const summary = details.reduce(
      (acc, detail) => {
        acc[detail.status] += 1
        return acc
      },
      { noActivity: 0, overdue: 0, warning: 0, onTrack: 0 },
    )

    const overdueList = details
      .filter((detail) => detail.status === "overdue")
      .sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0))
    const warningList = details
      .filter((detail) => detail.status === "warning")
      .sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0))
    const noActivityList = details.filter((detail) => detail.status === "noActivity")

    return {
      summary,
      details,
      overdueList,
      warningList,
      noActivityList,
    }
  }, [actions, prospects])

  const stageHeatmap = useMemo(() => {
    const stageMap = new Map<string, string>()
    const stageCountMap = new Map<string, number>()
    ;(prospects || []).forEach((prospect) => {
      const normalizedStage = normalizeStage(prospect.pipeline_stage)
      stageMap.set(prospect.id, normalizedStage)
      stageCountMap.set(normalizedStage, (stageCountMap.get(normalizedStage) || 0) + 1)
    })

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const stageLabels = STAGE_ORDER.map((stage) => stage.label)
    const activityList =
      activityTypes.length > 0
        ? activityTypes
        : ["call", "text", "email", "visit", "prospect_camp", "watched_live", "letter", "social_media", "other"]

    const counts = new Map<string, Map<string, number>>()
    const addCount = (stageLabel: string, activityType: string) => {
      if (!counts.has(stageLabel)) counts.set(stageLabel, new Map<string, number>())
      const stageCounts = counts.get(stageLabel)!
      stageCounts.set(activityType, (stageCounts.get(activityType) || 0) + 1)
    }

    actions.forEach((action) => {
      if (!action.action_date) return
      const actionDate = new Date(action.action_date)
      if (Number.isNaN(actionDate.getTime())) return
      if (actionDate < cutoff) return
      const type = normalizeActionType(action.action_type)
      if (type === "birthday") return
      const stageLabel = stageMap.get(action.athlete_id) || "Unassigned"
      addCount(stageLabel, type)
    })

    const rows = [...stageLabels, "Unassigned"].map((stage) => {
      const stageCounts = counts.get(stage) || new Map<string, number>()
      const record: Record<string, number> = {}
      activityList.forEach((type) => {
        record[type] = stageCounts.get(type) || 0
      })
      return { stage, counts: record }
    })

    const max = rows.reduce((maxValue, row) => {
      const rowMax = Math.max(...Object.values(row.counts))
      return Math.max(maxValue, rowMax)
    }, 0)

    const stageCountsObject: Record<string, number> = {}
    ;[...stageCountMap.entries()].forEach(([label, value]) => {
      stageCountsObject[label] = value
    })

    return { rows, activityList, max, stageCounts: stageCountsObject }
  }, [actions, activityTypes, prospects])

  const athleteActivityLeaderboard = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const nameMap = new Map<string, string>()
    const starMap = new Map<string, number | null>()
    ;(prospects || []).forEach((prospect) => {
      if (prospect.name) {
        nameMap.set(prospect.id, prospect.name)
      }
      starMap.set(prospect.id, prospect.star_rating ?? null)
    })

    const activityList =
      activityTypes.length > 0
        ? activityTypes
        : ["call", "text", "email", "visit", "prospect_camp", "watched_live", "letter", "social_media", "other"]

    const leaderboardCounts = new Map<
      string,
      {
        name: string
        counts: Record<string, number>
        total: number
        starRating: number | null
      }
    >()

    const addAthleteCount = (
      athleteId: string,
      displayName: string,
      starRating: number | null,
      activityType: string,
    ) => {
      if (!leaderboardCounts.has(athleteId)) {
        const initialCounts: Record<string, number> = {}
        activityList.forEach((type) => {
          initialCounts[type] = 0
        })
        leaderboardCounts.set(athleteId, {
          name: displayName,
          counts: initialCounts,
          total: 0,
          starRating,
        })
      }
      const athleteCounts = leaderboardCounts.get(athleteId)!
      athleteCounts.starRating = starRating
      athleteCounts.counts[activityType] = (athleteCounts.counts[activityType] || 0) + 1
      athleteCounts.total += 1
    }

    actions.forEach((action) => {
      if (!action.action_date) return
      const actionDate = new Date(action.action_date)
      if (Number.isNaN(actionDate.getTime())) return
      if (actionDate < cutoff) return
      const type = normalizeActionType(action.action_type)
      if (type === "birthday") return
      const displayName =
        nameMap.get(action.athlete_id) || action.athlete_name || "Unknown Athlete"
      const starRating = starMap.get(action.athlete_id) ?? null
      addAthleteCount(action.athlete_id, displayName, starRating, type)
    })

    const data = Array.from(leaderboardCounts.entries())
      .map(([, value]) => value)
      .filter((entry) => entry.total > 0)
      .sort((a, b) => {
        const starDiff = (b.starRating ?? 0) - (a.starRating ?? 0)
        if (starDiff !== 0) return starDiff
        return b.total - a.total
      })
      .slice(0, 10)

    const max = data.reduce((maxValue, entry) => Math.max(maxValue, entry.total), 0)

    return { data, activityList, max }
  }, [actions, activityTypes, prospects])

  const activityMixByAthlete = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const map = new Map<string, { total: number; calls: number; texts: number; emails: number; visits: number; other: number }>()

    const increment = (athleteId: string, key: "calls" | "texts" | "emails" | "visits" | "other") => {
      if (!map.has(athleteId)) {
        map.set(athleteId, { total: 0, calls: 0, texts: 0, emails: 0, visits: 0, other: 0 })
      }
      const entry = map.get(athleteId)!
      entry[key] += 1
      entry.total += 1
    }

    actions.forEach((action) => {
      if (!action.action_date) return
      const actionDate = new Date(action.action_date)
      if (Number.isNaN(actionDate.getTime())) return
      if (actionDate < cutoff) return
      const type = normalizeActionType(action.action_type)
      switch (type) {
        case "call":
          increment(action.athlete_id, "calls")
          break
        case "text":
        case "social_media":
          increment(action.athlete_id, "texts")
          break
        case "email":
          increment(action.athlete_id, "emails")
          break
        case "visit":
        case "prospect_camp":
          increment(action.athlete_id, "visits")
          break
        default:
          increment(action.athlete_id, "other")
      }
    })

    return map
  }, [actions])

  const renderCadenceSummary = () => {
    const { summary, overdueList, warningList, noActivityList } = cadenceStats
    const formatList = (list: typeof overdueList) =>
      list
        .slice(0, 3)
        .map((detail) =>
          detail.daysSince !== null ? `${detail.name} (${detail.daysSince}d)` : detail.name,
        )
        .join(", ")

    const cards = [
      {
        key: "overdue",
        label: "Overdue",
        value: summary.overdue,
        description: "Touches past cadence",
        highlight: rgbaFromHex(resolvedBrandColor, 0.18),
        border: rgbaFromHex(resolvedBrandColor, 0.35),
        text: resolvedBrandColor,
        detail: summary.overdue > 0 ? `Top: ${formatList(overdueList)}` : "",
      },
      {
        key: "warning",
        label: "Needs attention",
        value: summary.warning,
        description: "Approaching cadence",
        highlight: rgbaFromHex(resolvedBrandColor, 0.12),
        border: rgbaFromHex(resolvedBrandColor, 0.25),
        text: resolvedBrandColor,
        detail: summary.warning > 0 ? `Top: ${formatList(warningList)}` : "",
      },
      {
        key: "noActivity",
        label: "No activity",
        value: summary.noActivity,
        description: "No touches yet logged",
        highlight: rgbaFromHex(resolvedBrandColor, 0.08),
        border: "rgba(148, 163, 184, 0.35)",
        text: resolvedBrandColor,
        detail: summary.noActivity > 0 ? `Examples: ${formatList(noActivityList)}` : "",
      },
      {
        key: "onTrack",
        label: "On track",
        value: summary.onTrack,
        description: "Touches within cadence",
        highlight: "rgba(15, 23, 42, 0.08)",
        border: "rgba(148, 163, 184, 0.35)",
        text: "rgba(15, 23, 42, 0.9)",
        detail: "",
      },
    ]

    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border p-4"
            style={{ backgroundColor: card.highlight, borderColor: card.border }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: card.text }}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            {card.detail && (
              <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed">{card.detail}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderTrendCard = () => {
    if (activityTrendData.length === 0) {
      return (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Activity volume (last 14 days)</h4>
          </div>
          <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
            No activity logged in the last 14 days. Consider scheduling follow-ups.
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
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
              <Legend formatter={(value) => (value === "total" ? "Total" : formatActionType(value))} iconType="circle" />
              {activityTypes.map((type) => (
                <Bar key={type} dataKey={type} stackId="activity" fill={getActivityColor(type).fill} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderHeatmapCard = () => {
    if (stageHeatmap.rows.length === 0) {
      return (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Stage touch coverage (last 30 days)</h4>
          </div>
          <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
            No touch activity recorded for the selected window.
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Stage touch coverage (last 30 days)</h4>
          <span className="text-xs font-medium text-muted-foreground">
            {stageHeatmap.rows
              .map((row) => Object.values(row.counts).reduce((sum, value) => sum + value, 0))
              .reduce((sum, value) => sum + value, 0)}{" "}
            logged touches
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[160px_repeat(auto-fit,minmax(40px,1fr))]">
              <div className="h-10" />
              {stageHeatmap.activityList.map((type) => (
                <div
                  key={type}
                  className="h-10 px-2 flex items-center justify-center text-xs font-medium text-muted-foreground border border-border/50 bg-muted/40 first:border-l border-t-0"
                >
                  {formatActionType(type)}
                </div>
              ))}
            </div>
            {stageHeatmap.rows.map((row) => (
              <div key={row.stage} className="grid grid-cols-[160px_repeat(auto-fit,minmax(40px,1fr))]">
                <div className="h-12 flex items-center px-3 text-sm font-medium border border-border/60 bg-muted/40 first:border-l">
                  <div className="flex flex-col">
                    <span>{row.stage}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {stageHeatmap.stageCounts[row.stage] ?? 0} athletes
                    </span>
                  </div>
                </div>
                {stageHeatmap.activityList.map((type) => {
                  const count = row.counts[type] || 0
                  const intensity = stageHeatmap.max === 0 ? 0 : count / stageHeatmap.max
                  const bg =
                    intensity === 0
                      ? "rgba(148,163,184,0.15)"
                      : rgbaFromHex(resolvedBrandColor, 0.1 + intensity * 0.6)
                  const textColor = intensity > 0.5 ? "text-white" : "text-foreground"
                  return (
                    <div
                      key={`${row.stage}-${type}`}
                      className={`h-12 border border-border/60 flex items-center justify-center text-sm font-semibold transition-colors ${textColor}`}
                      style={{ backgroundColor: bg }}
                    >
                      {count}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderLeaderboardCard = () => {
    if (athleteActivityLeaderboard.data.length === 0) {
      return (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Priority athletes (last 30 days)</h4>
          </div>
          <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
            No athlete activity to display yet. Log touches to populate this view.
          </div>
        </div>
      )
    }

    const highlights = athleteActivityLeaderboard.data.slice(0, 3)

    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Priority athletes (last 30 days)</h4>
          <span className="text-xs font-medium text-muted-foreground">
            Sorted by star rating and total touches
          </span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={athleteActivityLeaderboard.data.map((entry) => ({
                name: entry.name,
                ...entry.counts,
              }))}
              layout="vertical"
              margin={{ left: 120, right: 16, top: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={120} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, key: string) => [`${value} ${formatActionType(key)}`, formatActionType(key)]}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.75rem",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend formatter={(value) => formatActionType(value)} iconType="circle" />
              {athleteActivityLeaderboard.activityList.map((type) => (
                <Bar key={type} dataKey={type} stackId="leaderboard" fill={getActivityColor(type).fill} radius={[0, 6, 6, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 text-xs text-muted-foreground/90">
          Top focus:
          <ul className="mt-1 space-y-1">
            {highlights.map((entry) => (
              <li key={entry.name} className="flex items-center gap-2">
                <span className="font-medium text-foreground">{entry.name}</span>
                {entry.starRating ? (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: rgbaFromHex(resolvedBrandColor, 0.2), color: resolvedBrandColor }}>
                    {entry.starRating}★
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground uppercase">Unrated</span>
                )}
                <span className="text-[10px] text-muted-foreground">{entry.total} touches</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

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
    const fillAlpha: Record<string, number> = {
      call: 0.95,
      text: 0.8,
      email: 0.65,
      visit: 0.75,
      prospect_camp: 0.6,
      watched_live: 0.55,
      letter: 0.5,
      social_media: 0.45,
      other: 0.4,
    }
    const fillColor = rgbaFromHex(resolvedBrandColor, fillAlpha[key] ?? 0.5)
    const colors: Record<string, { bg: string; text: string; border: string; fill: string }> = {
      call: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", fill: fillColor },
      text: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", fill: fillColor },
      email: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", fill: fillColor },
      visit: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", fill: fillColor },
      prospect_camp: { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-200", fill: fillColor },
      watched_live: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200", fill: fillColor },
      letter: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200", fill: fillColor },
      social_media: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200", fill: fillColor },
      other: { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-300", fill: fillColor },
    }
    return (
      colors[key] || {
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-border",
        fill: rgbaFromHex(resolvedBrandColor, 0.45),
      }
    )
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

  const filteredUntouchedAthletes = useMemo(() => {
    let list = cadenceStats.noActivityList

    if (selectedAthleteFilter !== "all") {
      list = list.filter((detail) => detail.id === selectedAthleteFilter)
    }

    if (selectedStarFilter !== "all") {
      list = list.filter((detail) => {
        if (selectedStarFilter === "unrated") return detail.starRating == null
        return detail.starRating === Number(selectedStarFilter)
      })
    }

    if (selectedCoachFilter !== "all") {
      // Untouched athletes do not have an assigned coach interaction yet
      return []
    }

    return list
  }, [cadenceStats, selectedAthleteFilter, selectedCoachFilter, selectedStarFilter])

  const openScheduleForAthlete = (
    athleteId: string,
    defaultType: string = "phone_call",
    options?: { followUpDate?: string },
  ) => {
    const today = new Date()
    const isoDate = today.toISOString().split("T")[0]
    const actionTypeValue = ACTION_TYPE_TO_FORM_VALUE[defaultType] ?? defaultType
    setNewActivityForm((prev) => ({
      ...prev,
      athleteId,
      actionType: actionTypeValue,
      actionDate: isoDate,
      followUpDate: options?.followUpDate ?? "",
      description: "",
      outcome: "",
    }))
    setCreatingActivity(true)
  }

  const renderTodayPlan = () => {
    const getSuggestedAction = (detail: any) => {
      const mix = activityMixByAthlete.get(detail.id)
      if (!detail.lastTouch) {
        return { label: "Kick off with a call", actionType: "call" }
      }
      if (mix) {
        if (mix.texts >= 3 && mix.calls === 0) {
          return { label: "Place a call to balance the touch mix", actionType: "call" }
        }
        if (mix.calls >= 2 && mix.texts === 0) {
          return { label: "Send a text or email check-in", actionType: "text" }
        }
      }
      if (detail.stage === "Offered") {
        return { label: "Follow up on offer details", actionType: "call" }
      }
      if (detail.stage === "Recruiting" && detail.daysSince && detail.daysSince > detail.threshold * 0.7) {
        return { label: "Schedule a visit or video call", actionType: "visit" }
      }
      return { label: "Log a meaningful touch", actionType: "call" }
    }

    const highPriority = cadenceStats.overdueList.slice(0, 5)
    const watchlist = cadenceStats.warningList.slice(0, 5)
    const untouched = cadenceStats.noActivityList.slice(0, 5)
    const momentum = cadenceStats.details
      .filter((detail) => detail.status === "onTrack" && detail.daysSince !== null && detail.daysSince <= 2)
      .slice(0, 5)

    const hasContent = highPriority.length + watchlist.length + untouched.length + momentum.length > 0
    if (!hasContent) {
      return null
    }

    const renderPlanList = (opts: {
      title: string
      items: typeof cadenceStats.details
      emptyCopy: string
      tone?: "primary" | "warning" | "danger"
    }) => {
      const { title, items, emptyCopy, tone = "primary" } = opts
      const toneClasses =
        tone === "danger"
          ? "text-red-500"
          : tone === "warning"
            ? "text-amber-500"
            : "text-primary"

      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
            <Badge variant="secondary" className="text-[10px] font-medium">
              {items.length}
            </Badge>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">{emptyCopy}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((detail) => {
                const suggestion = getSuggestedAction(detail)
                const daysCopy =
                  detail.daysSince === null ? "No touches logged" : `${detail.daysSince}d since last touch`

                return (
                  <li key={detail.id} className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-background/60 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{detail.name}</span>
                        {detail.starRating ? (
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {detail.starRating}★
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                            Unrated
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {detail.stage}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{daysCopy}</p>
                      <p className={`text-xs font-medium ${toneClasses}`}>{suggestion.label}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 whitespace-nowrap"
                      onClick={() => openScheduleForAthlete(detail.id, suggestion.actionType)}
                    >
                      Schedule
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )
    }

    return (
      <Card className="border border-muted/50 bg-gradient-to-br from-background via-background to-background/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            Today's Plan
          </CardTitle>
          <CardDescription>High-impact outreach suggestions based on recent cadence and activity mix.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          {renderPlanList({
            title: "High Priority",
            items: highPriority,
            emptyCopy: "Nobody is overdue right now. Keep the momentum!",
            tone: "danger",
          })}
          {renderPlanList({
            title: "Momentum",
            items: momentum,
            emptyCopy: "No fresh momentum yet. Log a fast touch today.",
            tone: "primary",
          })}
          {renderPlanList({
            title: "Watchlist",
            items: watchlist,
            emptyCopy: "No warnings today. Stay proactive!",
            tone: "warning",
          })}
          {renderPlanList({
            title: "Untouched",
            items: untouched,
            emptyCopy: "All athletes have at least one touch. Great job!",
            tone: "primary",
          })}
        </CardContent>
      </Card>
    )
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
              {renderTodayPlan()}
              {renderCadenceSummary()}
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Pipeline insights</span>
                <div className="inline-flex items-center rounded-full border border-border overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInsightMode("athletes")}
                    className={`rounded-none px-4 py-1 text-xs font-semibold ${
                      insightMode === "athletes" ? "text-white" : "text-muted-foreground"
                    }`}
                    style={
                      insightMode === "athletes"
                        ? { backgroundColor: rgbaFromHex(resolvedBrandColor, 0.9) }
                        : {}
                    }
                  >
                    Athletes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInsightMode("stage")}
                    className={`rounded-none px-4 py-1 text-xs font-semibold ${
                      insightMode === "stage" ? "text-white" : "text-muted-foreground"
                    }`}
                    style={
                      insightMode === "stage"
                        ? { backgroundColor: rgbaFromHex(resolvedBrandColor, 0.9) }
                        : {}
                    }
                  >
                    Stage
                  </Button>
                </div>
              </div>
              {insightMode === "athletes" ? (
                <div className="mb-6 grid gap-6 lg:grid-cols-2">
                  {renderTrendCard()}
                  {renderLeaderboardCard()}
                </div>
              ) : (
                <div className="mb-6 grid gap-6 lg:grid-cols-2">
                  {renderTrendCard()}
                  {renderHeatmapCard()}
                </div>
              )}

              <div className="mt-8 space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedAthleteFilter} onValueChange={setSelectedAthleteFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All athletes" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                        <SelectItem value="all">All athletes</SelectItem>
                        {athleteFilterOptions.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            {athlete.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All coaches" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                        <SelectItem value="all">All coaches</SelectItem>
                        {coachFilterOptions.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>
                            {coach.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedStarFilter} onValueChange={setSelectedStarFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="All ratings" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                        <SelectItem value="all">All ratings</SelectItem>
                        <SelectItem value="5">5★</SelectItem>
                        <SelectItem value="4">4★</SelectItem>
                        <SelectItem value="3">3★</SelectItem>
                        <SelectItem value="2">2★</SelectItem>
                        <SelectItem value="1">1★</SelectItem>
                        <SelectItem value="unrated">Unrated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant={showUntouchedOnly ? "default" : "outline"}
                      size="sm"
                      className="h-11"
                      onClick={() => setShowUntouchedOnly((prev) => !prev)}
                    >
                      Untouched only
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAthleteFilter("all")
                        setSelectedCoachFilter("all")
                        setSelectedStarFilter("all")
                        setShowUntouchedOnly(false)
                      }}
                    >
                      Clear filters
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreatingActivity(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Log activity
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/60 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full text-sm">
                      <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="text-left px-4 py-3">Athlete</th>
                          <th className="text-left px-4 py-3">Last activity</th>
                          <th className="text-left px-4 py-3">Coach</th>
                          <th className="text-left px-4 py-3">Outcome</th>
                          <th className="text-left px-4 py-3">Follow-up</th>
                          <th className="text-left px-4 py-3">Notes</th>
                          <th className="text-right px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showUntouchedOnly ? (
                          filteredUntouchedAthletes.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                No untouched athletes match your filters.
                              </td>
                            </tr>
                          ) : (
                            filteredUntouchedAthletes.map((detail) => (
                              <tr key={detail.id} className="border-t border-border/50 hover:bg-muted/20">
                                <td className="px-4 py-4">
                                  <div className="group flex items-center gap-3">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-foreground">{detail.name}</span>
                                      <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                        <span>{detail.stage}</span>
                                        <span>•</span>
                                        <span>{detail.starRating ? `${detail.starRating}★` : "Unrated"}</span>
                                      </div>
                                    </div>
                                    <div className="ml-auto hidden items-center gap-1 group-hover:flex">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openScheduleForAthlete(detail.id, "call")}
                                      >
                                        <Phone className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openScheduleForAthlete(detail.id, "email")}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      No activity logged
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="text-lg">🆕</span>
                                    <span>Log the first touch</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-muted-foreground">—</td>
                                <td className="px-4 py-4 text-muted-foreground">—</td>
                                <td className="px-4 py-4">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8">
                                        Schedule follow-up
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={undefined}
                                        onSelect={(date) => {
                                          if (!date) return
                                          const iso = date.toISOString().split("T")[0]
                                          openScheduleForAthlete(detail.id, "call", { followUpDate: iso })
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </td>
                                <td className="px-4 py-4 text-muted-foreground">—</td>
                                <td className="px-4 py-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openScheduleForAthlete(detail.id)}
                                  >
                                    Log activity
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )
                        ) : filteredActions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                              No activities match your filters yet.
                            </td>
                          </tr>
                        ) : (
                          filteredActions.map((action) => {
                            const normalizedType = normalizeActionType(action.action_type)
                            const emoji = ACTIVITY_EMOJI_MAP[normalizedType] ?? "📝"
                            const cadenceDetail = cadenceDetailByAthlete.get(action.athlete_id)
                            const daysBadge = cadenceDetail?.daysSince === null ? "No touch" : `${cadenceDetail?.daysSince ?? 0}d`
                            const coachInitials = getCoachInitials(action.coach_name)

                            return (
                              <tr key={action.id} className="border-t border-border/50 hover:bg-muted/20">
                                <td className="px-4 py-4">
                                  <div className="group flex items-center gap-3">
                                    <img
                                      src={action.athlete_photo || "/placeholder.svg?height=40&width=40"}
                                      alt={action.athlete_name}
                                      className="h-10 w-10 rounded-full object-cover shadow-sm"
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground">{action.athlete_name}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase">
                                          {daysBadge}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span>{cadenceDetail?.stage ?? "Prospect"}</span>
                                        <span>•</span>
                                        <span>{cadenceDetail?.starRating ? `${cadenceDetail.starRating}★` : "Unrated"}</span>
                                      </div>
                                    </div>
                                    <div className="ml-auto hidden items-center gap-1 group-hover:flex">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openScheduleForAthlete(action.athlete_id, "call")}
                                      >
                                        <Phone className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openScheduleForAthlete(action.athlete_id, "email")}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{emoji}</span>
                                    <div>
                                      <div className="text-sm font-semibold text-foreground">{formatDate(action.action_date)}</div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>{coachInitials}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => openScheduleForAthlete(action.athlete_id)}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-foreground">{action.coach_name || "—"}</td>
                                <td className="px-4 py-4 text-sm text-muted-foreground">{action.outcome || "—"}</td>
                                <td className="px-4 py-4">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8">
                                        {action.follow_up_date ? formatDate(action.follow_up_date) : "Schedule"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={action.follow_up_date ? new Date(action.follow_up_date) : undefined}
                                        onSelect={(date) => {
                                          if (!date) return
                                          const iso = date.toISOString().split("T")[0]
                                          openScheduleForAthlete(action.athlete_id, "call", { followUpDate: iso })
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </td>
                                <td className="px-4 py-4 text-sm text-muted-foreground">
                                  {action.description ? (
                                    <span className="line-clamp-2">{action.description}</span>
                                  ) : (
                                    <span className="text-muted-foreground/60">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(action)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700"
                                      onClick={() => handleDelete(action.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
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
              </div>
              {/* additional insights rendered via renderLeaderboardCard/renderHeatmapCard */}
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
