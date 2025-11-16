"use client"

import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarIcon,
  Clock,
  AlertCircle,
  TableIcon,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Edit,
  X,
  Check,
  Plus,
  Cake,
  Sparkles,
  Phone,
  Mail,
  AlertTriangle,
  Star,
  CheckCircle,
  Activity as ActivityIcon,
  Flame,
  Users as UsersIcon,
  MessageCircle,
  ClipboardList,
  TrendingUp,
  Search,
  List,
  PhoneCall,
  MessageSquare,
  Mail as MailIcon,
  FileText,
  ArrowRight,
  ArrowUpRight,
  Calendar as CalendarEvent,
} from "lucide-react"
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

const debugLog = (...args: unknown[]) => {
  try {
    console.log("[portal-activity]", ...args)
  } catch {
    // ignore logging failures
  }
}

const STAGE_ORDER: { id: string; label: string }[] = [
  { id: "Prospect", label: "Prospect" },
  { id: "Contacted", label: "Contacted" },
  { id: "Recruiting", label: "Recruiting" },
  { id: "Visited", label: "Visited" },
  { id: "Offered", label: "Offered" },
  { id: "Committed", label: "Committed" },
  { id: "Signed", label: "Signed" },
  { id: "Lost", label: "Lost" },
]

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

const clampChannel = (value: number) => Math.max(0, Math.min(255, value))

const adjustHexShade = (hex: string, amount: number) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = clampChannel(rgb.r + amount)
  const g = clampChannel(rgb.g + amount)
  const b = clampChannel(rgb.b + amount)
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const formatRelativeTimeFromNow = (date: Date) => {
  const now = Date.now()
  const diff = now - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return "Just now"
  if (diff < hour) {
    const minutes = Math.floor(diff / minute)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }
  const days = Math.floor(diff / day)
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

const normalizeStage = (stage: string | null | undefined): string => {
  const normalized = (stage || "Prospect").trim()
  const stageLower = normalized.toLowerCase()

  if (stageLower === "college athlete" || stageLower === "current college athlete") {
    return "Signed"
  }

  if (stageLower === "evaluating" || stageLower === "reached out") {
    return "Contacted"
  }

  return normalized
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
  college?: string | null
  commitmentdate?: string | null
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

interface ImmediateAttentionIssue {
  athleteId: string
  name: string
  stage: string
  starRating: number | null
  reason: string
  level: "critical" | "warning"
  ctaLabel: string
  ctaType: string
  ctaOptions?: { followUpDate?: string }
  priority: number
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
  const [tabValue, setTabValue] = useState<"dashboard" | "calendar" | "activity">("dashboard")
  const [showUntouchedOnly, setShowUntouchedOnly] = useState<boolean>(false)
  const [athleteSearchTerm, setAthleteSearchTerm] = useState("")
  const [activePriorityFilter, setActivePriorityFilter] = useState<"overdue" | "stale" | "priority" | "active" | null>(null)
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [contactRangeFilter, setContactRangeFilter] = useState<"all" | "0-7" | "7-14" | "14-30" | "30+" | "never">("all")
  const [engagementFilter, setEngagementFilter] = useState<"all" | "high" | "medium" | "low" | "at-risk" | "none">("all")
  const [followUpFilter, setFollowUpFilter] = useState<"all" | "overdue" | "dueWeek" | "scheduled" | "none">("all")
  const [showHighPriorityOnly, setShowHighPriorityOnly] = useState(false)
  const [showStaleOnly, setShowStaleOnly] = useState(false)
  const [selectedEngagementIds, setSelectedEngagementIds] = useState<Set<string>>(new Set())
  const [focusedAthleteId, setFocusedAthleteId] = useState<string | null>(null)
  const engagementTableRef = useRef<HTMLDivElement | null>(null)
  const openExternal = useCallback((href: string, target: "_blank" | "_self" = "_blank") => {
    if (typeof window === "undefined") {
      debugLog("window.open skipped (server)", { href, target })
      return
    }
    try {
      window.open(href, target)
    } catch (error) {
      console.error("[portal-activity] window.open failed", error)
      debugLog("window.open failed", { href, target, error })
    }
  }, [])
  const resolvedBrandColor = brandColor || DEFAULT_BRAND_COLOR
  const chartPalette = useMemo(() => {
    return [
      resolvedBrandColor,
      adjustHexShade(resolvedBrandColor, 35),
      adjustHexShade(resolvedBrandColor, -25),
      "#ef4444",
    ]
  }, [resolvedBrandColor])

  useEffect(() => {
    debugLog("component mounted", {
      schoolId,
      brandColor,
      prospectsCount: prospects?.length ?? 0,
    })
    return () => debugLog("component unmounted")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    debugLog("actions updated", { count: actions.length })
  }, [actions])

  useEffect(() => {
    debugLog("prospects updated", { count: prospects?.length ?? 0 })
  }, [prospects])

  useEffect(() => {
    /* eslint-disable no-console */
    console.log("[portal-debug] RecruitingActionsDashboard mounted", {
      hasNormalizeStage: typeof normalizeStage,
      stageOrderLength: Array.isArray(STAGE_ORDER) ? STAGE_ORDER.length : "not-array",
      prospectCount: prospects?.length ?? 0,
    })
    /* eslint-enable no-console */
  }, [prospects])

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
      debugLog("Skipping starred-athletes fetch (schoolId provided)")
      return
    }
    
    try {
      debugLog("Fetching starred athletes for dashboard context")
      const response = await fetch("/api/coaches/starred-athletes")
      if (response.ok) {
        const data = await response.json()
        const athletes = (data.athletes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
        }))
        setAvailableAthletes(athletes)
        debugLog("Starred athletes fetched", { count: athletes.length })
      } else {
        debugLog("Starred athletes fetch failed", { status: response.status })
      }
    } catch (error) {
      console.error("[portal-activity] Error fetching starred athletes", error)
      debugLog("Starred athletes fetch error", { error })
    }
  }

  const fetchActions = async () => {
    try {
      let url = ""
      // Only use schoolId if it's a non-empty string
      if (schoolId && typeof schoolId === "string" && schoolId.trim().length > 0) {
        debugLog("Fetching actions for school portal", { schoolId })
        url = `/api/coach-portal/activities?schoolId=${encodeURIComponent(schoolId)}`
      } else {
        debugLog("Fetching actions for current coach context")
        url = `/api/coaches/all-actions`
      }
      
      const response = await fetch(url)
      debugLog("Activities API response", { status: response.status, url })

      if (response.ok) {
        const data = await response.json()
        // Handle both response formats: { activities: [] } and { actions: [] }
        const activities = data.activities || data.actions || []
        debugLog("Activities data parsed", { count: activities.length })
        setActions(activities)
      } else {
        const errorText = await response.text()
        console.error("[portal-activity] Fetch actions failed", response.status, errorText)
        debugLog("Fetch actions failed", { status: response.status, body: errorText })
      }
    } catch (error) {
      console.error("[portal-activity] Error fetching actions:", error)
      debugLog("Fetch actions error", { error })
    } finally {
      setIsLoading(false)
    }
  }

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

  const cadenceDetailByAthlete = useMemo(() => {
    const map = new Map<string, any>()
    cadenceStats.details.forEach((detail) => map.set(detail.id, detail))
    return map
  }, [cadenceStats])

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

  const lastActionByAthlete = useMemo(() => {
    const map = new Map<string, RecruitingAction>()
    actions.forEach((action) => {
      if (!action.action_date) return
      const date = new Date(action.action_date)
      if (Number.isNaN(date.getTime())) return
      const existing = map.get(action.athlete_id)
      if (!existing || new Date(existing.action_date) < date) {
        map.set(action.athlete_id, action)
      }
    })
    return map
  }, [actions])

  const touchesByAthlete = useMemo(() => {
    const now = new Date()
    const last7 = new Date(now)
    last7.setDate(now.getDate() - 7)
    const last30 = new Date(now)
    last30.setDate(now.getDate() - 30)
    const map = new Map<
      string,
      { total: number; last7: number; last30: number; first: Date | null; last: Date | null }
    >()

    actions.forEach((action) => {
      if (!action.action_date) return
      const date = new Date(action.action_date)
      if (Number.isNaN(date.getTime())) return
      if (!map.has(action.athlete_id)) {
        map.set(action.athlete_id, { total: 0, last7: 0, last30: 0, first: null, last: null })
      }
      const entry = map.get(action.athlete_id)!
      entry.total += 1
      if (date >= last7) entry.last7 += 1
      if (date >= last30) entry.last30 += 1
      entry.last = !entry.last || date > entry.last ? date : entry.last
      entry.first = !entry.first || date < entry.first ? date : entry.first
    })

    return map
  }, [actions])

  const nextFollowUpByAthlete = useMemo(() => {
    const map = new Map<string, Date>()
    actions.forEach((action) => {
      if (!action.follow_up_date) return
      const raw = action.follow_up_date.includes("T") ? action.follow_up_date.split("T")[0] : action.follow_up_date
      const [y, m, d] = raw.split("-").map(Number)
      const date = new Date(y, (m ?? 1) - 1, d ?? 1)
      if (Number.isNaN(date.getTime())) return
      const existing = map.get(action.athlete_id)
      if (!existing || date < existing) {
        map.set(action.athlete_id, date)
      }
    })
    return map
  }, [actions])

  const pendingVisitsByAthlete = useMemo(() => {
    const map = new Map<string, RecruitingAction>()
    const now = new Date()
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)
    actions.forEach((action) => {
      if (!action.follow_up_date) return
      const type = action.action_type.toLowerCase()
      if (!type.includes("visit")) return
      const followDate = new Date(action.follow_up_date)
      if (Number.isNaN(followDate.getTime())) return
      if (followDate >= now && followDate <= soon) {
        map.set(action.athlete_id, action)
      }
    })
    return map
  }, [actions])

  const engagementRows = useMemo(() => {
    const dayMs = 1000 * 60 * 60 * 24
    const now = new Date()
    return cadenceStats.details.map((detail) => {
      const touches = touchesByAthlete.get(detail.id) ?? {
        total: 0,
        last7: 0,
        last30: 0,
        first: null,
        last: null,
      }
      const nextFollowUp = nextFollowUpByAthlete.get(detail.id) ?? null
      const lastAction = lastActionByAthlete.get(detail.id)
      const contactRange =
        detail.daysSince === null
          ? "never"
          : detail.daysSince <= 7
            ? "0-7"
            : detail.daysSince <= 14
              ? "7-14"
              : detail.daysSince <= 30
                ? "14-30"
                : "30+"

      let engagementLevel: "high" | "medium" | "low" | "at-risk" | "none" = "none"
      if (detail.lastTouch) {
        if ((detail.daysSince ?? Infinity) <= 7 && touches.last7 >= 2) {
          engagementLevel = "high"
        } else if ((detail.daysSince ?? Infinity) <= 14) {
          engagementLevel = "medium"
        } else if ((detail.daysSince ?? Infinity) <= 30) {
          engagementLevel = "low"
        } else {
          engagementLevel = "at-risk"
        }
      }

      const engagementScore =
        engagementLevel === "high"
          ? 90
          : engagementLevel === "medium"
            ? 70
            : engagementLevel === "low"
              ? 50
              : engagementLevel === "at-risk"
                ? 30
                : 10

      const followUpStatus: "overdue" | "dueWeek" | "scheduled" | "none" = nextFollowUp
        ? nextFollowUp.getTime() < now.getTime()
          ? "overdue"
          : nextFollowUp.getTime() - now.getTime() <= 7 * dayMs
            ? "dueWeek"
            : "scheduled"
        : "none"

      const daysActive =
        touches.first && touches.last
          ? Math.max(1, (touches.last.getTime() - touches.first.getTime()) / dayMs)
          : 1
      const touchFrequency = Number((touches.total / Math.max(1, daysActive / 7)).toFixed(1))

      return {
        id: detail.id,
        name: detail.name,
        stage: detail.stage,
        starRating: detail.starRating ?? null,
        daysSince: detail.daysSince,
        status: detail.status,
        totalTouches: touches.total,
        touchesLast30: touches.last30,
        touchFrequency,
        engagementLevel,
        engagementScore,
        contactRange,
        nextFollowUp,
        followUpStatus,
        lastTouch: detail.lastTouch,
        lastAction,
      }
    })
  }, [cadenceStats.details, touchesByAthlete, nextFollowUpByAthlete, lastActionByAthlete])

  const activeThisWeekIds = useMemo(() => {
    const seven = new Date()
    seven.setDate(seven.getDate() - 7)
    return new Set(
      actions
        .filter((action) => {
          if (!action.action_date) return false
          const date = new Date(action.action_date)
          if (Number.isNaN(date.getTime())) return false
          return date >= seven
        })
        .map((action) => action.athlete_id),
    )
  }, [actions])

  const engagementSummary = useMemo(() => {
    const highPriorityUntouched = cadenceStats.details.filter(
      (detail) => detail.status === "noActivity" && (detail.starRating ?? 0) >= 4,
    ).length
    const activeThisWeek = activeThisWeekIds.size

    return {
      overdue: cadenceStats.summary.overdue,
      stale: cadenceStats.summary.warning,
      highPriorityUntouched,
      activeThisWeek,
    }
  }, [cadenceStats, activeThisWeekIds])

  const immediateAttentionIssues = useMemo<ImmediateAttentionIssue[]>(() => {
    const issues: ImmediateAttentionIssue[] = []
    const addIssue = (issue: ImmediateAttentionIssue) => {
      issues.push(issue)
    }

    engagementRows.forEach((row) => {
      const days = row.daysSince ?? null
      const rating = row.starRating ?? 0
      const lastActionLabel = row.lastAction
        ? `Last: ${formatDate(row.lastAction.action_date)}`
        : "No previous activity"
      if (rating >= 4 && days !== null && days >= 30) {
        addIssue({
          athleteId: row.id,
          name: row.name,
          stage: row.stage,
          starRating: row.starRating ?? null,
          reason: `${days}d no contact • ${lastActionLabel}`,
          level: "critical",
          ctaLabel: "Contact now",
          ctaType: "phone_call",
          priority: 5,
        })
      }
      if (row.followUpStatus === "overdue") {
        addIssue({
          athleteId: row.id,
          name: row.name,
          stage: row.stage,
          starRating: row.starRating ?? null,
          reason: `Follow-up overdue${row.nextFollowUp ? ` • Due ${formatDate(row.nextFollowUp.toISOString())}` : ""}`,
          level: "critical",
          ctaLabel: "Log follow-up",
          ctaType: "phone_call",
          ctaOptions: row.nextFollowUp
            ? { followUpDate: row.nextFollowUp.toISOString().split("T")[0] }
            : undefined,
          priority: 4,
        })
      }
      if (row.stage === "Offered" && (days ?? Infinity) >= 14) {
        addIssue({
          athleteId: row.id,
          name: row.name,
          stage: row.stage,
          starRating: row.starRating ?? null,
          reason: `${days ?? 0}d since offer — no response`,
          level: "critical",
          ctaLabel: "Send reminder",
          ctaType: "email",
          priority: 3,
        })
      }
      if (rating >= 4 && days !== null && days >= 14 && days < 30) {
        addIssue({
          athleteId: row.id,
          name: row.name,
          stage: row.stage,
          starRating: row.starRating ?? null,
          reason: `${days}d since last touch • ${lastActionLabel}`,
          level: "warning",
          ctaLabel: "Schedule check-in",
          ctaType: "phone_call",
          priority: 2,
        })
      }
      const pendingVisit = pendingVisitsByAthlete.get(row.id)
      if (pendingVisit) {
        addIssue({
          athleteId: row.id,
          name: row.name,
          stage: row.stage,
          starRating: row.starRating ?? null,
          reason: `Visit on ${formatDate(pendingVisit.follow_up_date!)} needs confirmation`,
          level: "warning",
          ctaLabel: "Confirm visit",
          ctaType: "phone_call",
          ctaOptions: { followUpDate: pendingVisit.follow_up_date?.split("T")[0] },
          priority: 1,
        })
      }
    })

    const sorted = issues.sort((a, b) => {
      if (a.level === b.level) {
        return b.priority - a.priority
      }
      return a.level === "critical" ? -1 : 1
    })
    return sorted.slice(0, 5)
  }, [engagementRows, pendingVisitsByAthlete])

  const activityVolumeSummary = useMemo(() => {
    const days = 10
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const buckets: Array<{
      date: string
      calls: number
      messages: number
      visits: number
    }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      buckets.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        calls: 0,
        messages: 0,
        visits: 0,
      })
    }
    const bucketMap = new Map<string, (typeof buckets)[number]>()
    buckets.forEach((bucket) => bucketMap.set(bucket.date, bucket))

    actions.forEach((action) => {
      if (!action.action_date) return
      const actionDate = new Date(action.action_date)
      if (Number.isNaN(actionDate.getTime())) return
      actionDate.setHours(0, 0, 0, 0)
      const key = actionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const bucket = bucketMap.get(key)
      if (!bucket) return
      const type = normalizeActionType(action.action_type)
      if (type === "call") bucket.calls += 1
      else if (type === "text" || type === "email" || type === "social_media") bucket.messages += 1
      else bucket.visits += 1
    })

    return buckets
  }, [actions])

  const stageEngagementData = useMemo(() => {
    const map = new Map<
      string,
      { touches: number; athletes: number; totalDays: number; staleCount: number }
    >()
    cadenceStats.details.forEach((detail) => {
      if (!map.has(detail.stage)) {
        map.set(detail.stage, { touches: 0, athletes: 0, totalDays: 0, staleCount: 0 })
      }
      const entry = map.get(detail.stage)!
      entry.athletes += 1
      if (detail.daysSince !== null) {
        entry.totalDays += detail.daysSince
        if (detail.daysSince >= 14) {
          entry.staleCount += 1
        }
      }
      const touches = touchesByAthlete.get(detail.id)
      if (touches) {
        entry.touches += touches.last30
      }
    })

    return Array.from(map.entries()).map(([stage, stats]) => ({
      stage,
      touches: stats.touches,
      avgDays: stats.athletes > 0 ? Math.round(stats.totalDays / stats.athletes) : 0,
      stalePercent: stats.athletes > 0 ? Math.round((stats.staleCount / stats.athletes) * 100) : 0,
    }))
  }, [cadenceStats.details, touchesByAthlete])

  const filteredEngagementRows = useMemo(() => {
    const search = athleteSearchTerm.trim().toLowerCase()
    return engagementRows.filter((row) => {
      // When a quick filter card is active, enforce its semantics first
      if (activePriorityFilter === "active" && !activeThisWeekIds.has(row.id)) {
        return false
      }
      if (search) {
        const haystack = [
          row.name,
          row.stage,
          row.lastAction?.description,
          row.lastAction?.action_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search)) {
          return false
        }
      }
      if (stageFilter !== "all" && row.stage !== stageFilter) return false
      if (contactRangeFilter !== "all" && row.contactRange !== contactRangeFilter) return false
      if (engagementFilter !== "all" && row.engagementLevel !== engagementFilter) return false
      if (followUpFilter !== "all" && row.followUpStatus !== followUpFilter) return false
      if (showHighPriorityOnly && (row.starRating ?? 0) < 4) return false
      if (showStaleOnly && (row.daysSince ?? 0) < 14 && row.daysSince !== null) return false
      if (showUntouchedOnly && row.status !== "noActivity") return false
      return true
    })
  }, [
    engagementRows,
    athleteSearchTerm,
    activePriorityFilter,
    activeThisWeekIds,
    stageFilter,
    contactRangeFilter,
    engagementFilter,
    followUpFilter,
    showHighPriorityOnly,
    showStaleOnly,
    showUntouchedOnly,
  ])

  const sortedEngagementRows = useMemo(() => {
    return [...filteredEngagementRows].sort((a, b) => {
      const daysA = a.daysSince === null ? Infinity : a.daysSince
      const daysB = b.daysSince === null ? Infinity : b.daysSince
      return daysB - daysA
    })
  }, [filteredEngagementRows])

  const focusedAthlete = useMemo(() => {
    if (!focusedAthleteId) return null
    return engagementRows.find((row) => row.id === focusedAthleteId) ?? null
  }, [focusedAthleteId, engagementRows])

  const focusedAthleteActions = useMemo(() => {
    if (!focusedAthleteId) return []
    return [...actions]
      .filter((action) => action.athlete_id === focusedAthleteId)
      .sort((a, b) => {
        const dateA = new Date(a.action_date)
        const dateB = new Date(b.action_date)
        return dateB.getTime() - dateA.getTime()
      })
  }, [actions, focusedAthleteId])

  const recentActivityTimeline = useMemo(() => {
    return [...actions]
      .filter((action) => action.action_date)
      .sort((a, b) => {
        const dateA = new Date(a.action_date)
        const dateB = new Date(b.action_date)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 50)
  }, [actions])

  const stageFunnelData = useMemo(() => {
    const total = cadenceStats.details.length || 0
    const rows = STAGE_ORDER.map((stage) => {
      const count = cadenceStats.details.filter((detail) => detail.stage === stage.label).length
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      return { label: stage.label, count, percentage }
    })
    return { total, rows }
  }, [cadenceStats.details])

  const lostRecruitEntries = useMemo(() => {
    const lostProspects =
      prospects
        ?.filter((prospect) => normalizeStage(prospect.pipeline_stage) === "Lost")
        .map((prospect) => ({
          id: prospect.id,
          name: prospect.name,
          school: prospect.college || "Committed Elsewhere",
          committedAgo: prospect.commitmentdate ? formatRelativeTimeFromNow(new Date(prospect.commitmentdate)) : "Recent",
          previousStage: normalizeStage(prospect.pipeline_stage) || "Prospect",
        })) || []

    if (lostProspects.length >= 4) {
      return lostProspects.slice(0, 4)
    }

    const sample = [
      {
        id: "sample-1",
        name: "Mason Rivera",
        school: "NC State",
        committedAgo: "3 days ago",
        previousStage: "Offered",
      },
      {
        id: "sample-2",
        name: "Evan Turner",
        school: "Virginia Tech",
        committedAgo: "6 days ago",
        previousStage: "Recruiting",
      },
      {
        id: "sample-3",
        name: "Cole Bryant",
        school: "Penn State",
        committedAgo: "9 days ago",
        previousStage: "Visited",
      },
    ]

    return [...lostProspects, ...sample.slice(0, Math.max(0, 3 - lostProspects.length))]
  }, [prospects])

  const weeklyCallSummary = useMemo(() => {
    const now = new Date()
    const startCurrent = new Date(now)
    startCurrent.setDate(now.getDate() - 7)
    const startPrevious = new Date(now)
    startPrevious.setDate(now.getDate() - 14)
    const endPrevious = new Date(now)
    endPrevious.setDate(now.getDate() - 7)

    let current = 0
    let previous = 0

    actions.forEach((action) => {
      if (!action.action_date) return
      const date = new Date(action.action_date)
      if (Number.isNaN(date.getTime())) return
      const type = normalizeActionType(action.action_type)
      if (type !== "call") return
      if (date >= startCurrent) {
        current += 1
      } else if (date >= startPrevious && date < endPrevious) {
        previous += 1
      }
    })

    return { current, delta: current - previous }
  }, [actions])

  const resetEngagementFilters = () => {
    setStageFilter("all")
    setContactRangeFilter("all")
    setEngagementFilter("all")
    setFollowUpFilter("all")
    setShowHighPriorityOnly(false)
    setShowStaleOnly(false)
    setShowUntouchedOnly(false)
    setAthleteSearchTerm("")
  }

  const handlePriorityCardClick = (type: "overdue" | "stale" | "priority" | "active") => {
    // If clicking the same filter, clear it
    if (activePriorityFilter === type) {
      setActivePriorityFilter(null)
      resetEngagementFilters()
      requestAnimationFrame(() => {
        engagementTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
      return
    }

    setActivePriorityFilter(type)
    resetEngagementFilters()
    switch (type) {
      case "overdue":
        setFollowUpFilter("overdue")
        setContactRangeFilter("30+")
        break
      case "stale":
        setContactRangeFilter("14-30")
        setShowStaleOnly(true)
        break
      case "priority":
        setShowHighPriorityOnly(true)
        setShowUntouchedOnly(true)
        setContactRangeFilter("never")
        break
      case "active":
        setContactRangeFilter("0-7")
        setEngagementFilter("high")
        break
    }
    requestAnimationFrame(() => {
      engagementTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const toggleRowSelection = (id: string) => {
    debugLog("Toggle row selection", { id })
    setSelectedEngagementIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAllRows = () => {
    debugLog("Toggle select all rows", { current: selectedEngagementIds.size, total: sortedEngagementRows.length })
    setSelectedEngagementIds((previous) => {
      if (previous.size === sortedEngagementRows.length) {
        return new Set()
      }
      return new Set(sortedEngagementRows.map((row) => row.id))
    })
  }

  const bulkSelectionCount = selectedEngagementIds.size
  const isAllRowsSelected = sortedEngagementRows.length > 0 && bulkSelectionCount === sortedEngagementRows.length

  const handleBulkAction = (actionType: "log" | "followup" | "message" | "export") => {
    debugLog("Bulk action triggered", { actionType, selected: Array.from(selectedEngagementIds) })
    if (selectedEngagementIds.size === 0) return
    const [firstId] = Array.from(selectedEngagementIds)
    if (!firstId) return
    if (actionType === "export") {
      console.log("Exporting engagement report for athletes:", Array.from(selectedEngagementIds))
      return
    }
    if (actionType === "message") {
      openScheduleForAthlete(firstId, "email")
      return
    }
    if (actionType === "followup") {
      openScheduleForAthlete(firstId, "call")
      return
    }
    openScheduleForAthlete(firstId)
  }

  const handleBulkMoveStage = (stage: string) => {
    if (selectedEngagementIds.size === 0) return
    console.log("[bulk-stage] Moving athletes to stage:", stage, Array.from(selectedEngagementIds))
  }

  const handleBulkScheduleFollowUps = () => handleBulkAction("followup")
  const handleBulkLogActivity = () => handleBulkAction("log")
  const handleBulkSendMessage = () => handleBulkAction("message")
  const handleBulkExport = () => handleBulkAction("export")
  const handleBulkDeselect = () => setSelectedEngagementIds(new Set())

  const getDaysBadgeTone = (days: number | null) => {
    if (days === null) {
      return {
        label: "No touch",
        className: "bg-muted text-muted-foreground border-transparent",
      }
    }
    if (days <= 7) {
      return {
        label: `${days}d`,
        className: "bg-emerald-500 text-white border-transparent",
      }
    }
    if (days <= 14) {
      return {
        label: `${days}d`,
        className: "bg-amber-500 text-white border-transparent",
      }
    }
    if (days <= 30) {
      return {
        label: `${days}d`,
        className: "bg-orange-500 text-white border-transparent",
      }
    }
    return {
      label: `${days}d`,
      className: "bg-red-500 text-white border-transparent",
    }
  }

  const getEngagementBadgeClasses = (level: "high" | "medium" | "low" | "at-risk" | "none") => {
    switch (level) {
      case "high":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/40"
      case "medium":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30"
      case "low":
        return "bg-amber-500/10 text-amber-600 border-amber-500/40"
      case "at-risk":
        return "bg-red-500/10 text-red-500 border-red-500/40"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
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

  const getRecentActivityIcon = (type: string) => {
    const normalized = normalizeActionType(type).toLowerCase()
    switch (normalized) {
      case "call":
        return { icon: PhoneCall, className: "text-emerald-500" }
      case "text":
      case "text message":
        return { icon: MessageSquare, className: "text-blue-500" }
      case "email":
      case "letter":
        return { icon: MailIcon, className: "text-indigo-500" }
      case "note":
        return { icon: FileText, className: "text-amber-500" }
      case "stage change":
        return { icon: ArrowRight, className: "text-fuchsia-500" }
      case "visit":
      case "campus visit":
      case "tournament visit":
      case "home visit":
        return { icon: CalendarEvent, className: "text-purple-500" }
      default:
        return { icon: ActivityIcon, className: "text-muted-foreground" }
    }
  }

  function formatDate(dateString: string) {
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
    const callsOverdue = cadenceStats.summary.overdue
    const followUpsDue = cadenceStats.summary.warning
    const visitsThisWeek = actions.filter((action) => {
      if (!action.action_date) return false
      const date = new Date(action.action_date)
      if (Number.isNaN(date.getTime())) return false
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return (
        date >= sevenDaysAgo &&
        (normalizeActionType(action.action_type) === "visit" || normalizeActionType(action.action_type) === "prospect_camp")
      )
    }).length

    const priorityItems = [
      {
        label: "Calls overdue",
        count: callsOverdue,
        description: "Follow-ups past due",
        color: "text-red-500",
        icon: AlertCircle,
        action: () => handlePriorityCardClick("overdue"),
      },
      {
        label: "Follow-ups due",
        count: followUpsDue,
        description: "Within next 7 days",
        color: "text-amber-500",
        icon: Clock,
        action: () => handlePriorityCardClick("stale"),
      },
      {
        label: "Visits this week",
        count: visitsThisWeek,
        description: "On-site touchpoints",
        color: "text-emerald-500",
        icon: ActivityIcon,
        action: () => handlePriorityCardClick("active"),
      },
    ]

    return (
      <Card className="border border-muted/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Today's priorities
          </CardTitle>
          <CardDescription>Key items to keep the pipeline healthy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {priorityItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-card/60 p-3 text-left transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${item.color}`}>{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-2xl font-bold text-foreground">{item.count}</span>
              </div>
            </button>
          ))}
          <Button variant="ghost" className="w-full text-sm" onClick={() => handlePriorityCardClick("priority")}>
            View all tasks
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleImmediateIssueAction = (issue: ImmediateAttentionIssue) => {
    openScheduleForAthlete(issue.athleteId, issue.ctaType, issue.ctaOptions)
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

        {/* Activity Tab - Engagement intelligence */}
        <TabsContent value="activity">
          <div className="container mx-auto px-4 space-y-8">
            {/* Top action row: Today's priorities + Immediate attention */}
            <div className="grid gap-6 lg:grid-cols-[0.38fr_0.62fr]">
              <div className="space-y-6">{renderTodayPlan()}</div>

              <Card className="border border-amber-500/40 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    ⚠️ Athletes needing immediate attention
                  </CardTitle>
                  <CardDescription>High-priority targets requiring urgent action.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {immediateAttentionIssues.length === 0 ? (
                    <div className="text-sm text-muted-foreground">All critical athletes are up to date.</div>
                  ) : (
                    immediateAttentionIssues.map((issue) => (
                      <div
                        key={issue.athleteId + issue.reason}
                        className="rounded-lg border border-border/60 bg-card/80 p-3 flex items-start justify-between gap-3"
                      >
                        <div className="flex gap-3">
                          <span className="text-xl">{issue.level === "critical" ? "🔴" : "🟡"}</span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {issue.name}
                              {issue.starRating ? ` (${issue.starRating}★, ${issue.stage})` : ` (${issue.stage})`}
                            </p>
                            <p className="text-xs text-muted-foreground">{issue.reason}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => handleImmediateIssueAction(issue)}
                        >
                          {issue.ctaLabel} →
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-primary text-sm"
                    onClick={() =>
                      engagementTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    View all issues →
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/70 bg-gradient-to-br from-background to-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon className="h-5 w-5 text-primary" />
                  Recruiting Pipeline
                </CardTitle>
                <CardDescription>Track how prospects move from Prospect to Signed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {stageFunnelData.rows.map((stage, index) => {
                    const width = stageFunnelData.total === 0 ? 0 : Math.max(8, stage.percentage)
                    return (
                      <div key={stage.label}>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-semibold text-foreground">{stage.label}</span>
                          <span>
                            {stage.count} • {stage.percentage}%
                          </span>
                        </div>
                        <div className="h-9 rounded-r-full bg-muted flex items-center">
                          <div
                            className="h-full rounded-r-full flex items-center px-3 text-xs font-semibold text-white transition-all"
                            style={{
                              width: `${width}%`,
                              backgroundColor: rgbaFromHex(adjustHexShade(resolvedBrandColor, index * 12), 0.9),
                            }}
                          >
                            {stage.count === 0 ? "—" : `${stage.count} athletes`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {[
                    {
                      label: "Total Pipeline",
                      value: stageFunnelData.total,
                      subtext: "Active recruits",
                      accent: "text-primary",
                    },
                    {
                      label: "Lost to Others",
                      value: stageFunnelData.rows.find((stage) => stage.label === "Lost")?.count ?? 0,
                      subtext: "Needs review",
                      accent: "text-red-500",
                    },
                    {
                      label: "Offers Out",
                      value: stageFunnelData.rows.find((stage) => stage.label === "Offered")?.count ?? 0,
                      subtext: "Awaiting decisions",
                      accent: "text-amber-500",
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border/60 bg-card/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Touch volume (last 10 days)
                  </CardTitle>
                  <CardDescription>
                    You made {weeklyCallSummary.current} calls this week ({weeklyCallSummary.delta >= 0 ? "+" : ""}
                    {weeklyCallSummary.delta} vs last week).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityVolumeSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="calls" stackId="activity" fill={chartPalette[0]} />
                      <Bar dataKey="messages" stackId="activity" fill={chartPalette[1]} />
                      <Bar dataKey="visits" stackId="activity" fill={chartPalette[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" />
                    Stage velocity
                  </CardTitle>
                  <CardDescription>Average days between touches per stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stageEngagementData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity recorded for the selected window.</p>
                  ) : (
                    stageEngagementData.map((stage) => (
                      <div key={stage.stage} className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{stage.stage}</p>
                          <p className="text-xs text-muted-foreground">
                            {stage.avgDays} days avg • {stage.touches} touches
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[11px] font-semibold ${
                            stage.stalePercent > 30 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {stage.stalePercent}% stale
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.38fr_0.62fr]">
              <Card className="border border-border/70 h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Team activity
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedDay({
                          date: new Date(),
                          activities: getActivitiesForDate(new Date().getDate()),
                        })
                      }
                    >
                      View calendar
                    </Button>
                  </div>
                  <CardDescription>Latest touches across the staff.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivityTimeline.slice(0, 5).map((activity) => {
                    const { icon: IconComponent, className } = getRecentActivityIcon(activity.action_type)
                    return (
                      <div key={activity.id} className="flex gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <div className={`mt-0.5 rounded-full bg-muted p-2 ${className}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {activity.athlete_name}{" "}
                            <span className="text-muted-foreground">({formatActionType(activity.action_type)})</span>
                          </p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {formatRelativeTimeFromNow(new Date(activity.action_date))}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <Button variant="outline" className="w-full">
                    View all activity
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🎯 Quick filters</p>
              <p className="text-xs text-muted-foreground">
                {activePriorityFilter
                  ? `Showing ${filteredEngagementRows.length} athletes matching this filter`
                  : "Click to focus the engagement table below"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "overdue",
                  label: "Overdue",
                  sublabel: "Follow-ups past due",
                  value: engagementSummary.overdue,
                  accent: "border-red-500/40 bg-red-500/5",
                  icon: AlertTriangle,
                },
                {
                  key: "stale",
                  label: "Stale",
                  sublabel: "14+ days no touch",
                  value: engagementSummary.stale,
                  accent: "border-amber-500/40 bg-amber-500/5",
                  icon: Clock,
                },
                {
                  key: "priority",
                  label: "High Priority",
                  sublabel: "4-5★ no touch",
                  value: engagementSummary.highPriorityUntouched,
                  accent: "border-yellow-500/40 bg-yellow-500/5",
                  icon: Star,
                },
                {
                  key: "active",
                  label: "Active This Week",
                  sublabel: "Touches logged",
                  value: engagementSummary.activeThisWeek,
                  accent: "border-emerald-500/40 bg-emerald-500/5",
                  icon: CheckCircle,
                },
              ].map((card) => (
                <button
                  key={card.key}
                  onClick={() => handlePriorityCardClick(card.key as "overdue" | "stale" | "priority" | "active")}
                  className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    activePriorityFilter === card.key
                      ? `${card.accent} border-primary shadow-lg`
                      : `${card.accent}`
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.label}
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-foreground">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {card.sublabel}
                    {activePriorityFilter === card.key && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        ✓ Active
                      </span>
                    )}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground pt-2">
              <div className="flex-1 border-t border-border/60" />
              <span className="flex items-center gap-2 whitespace-nowrap">
                📋 Engagement table
              </span>
              <div className="flex-1 border-t border-border/60" />
            </div>

            <div ref={engagementTableRef} className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {STAGE_ORDER.map((stage) => (
                        <SelectItem key={stage.id} value={stage.label}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={contactRangeFilter} onValueChange={setContactRangeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Days since contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any recency</SelectItem>
                      <SelectItem value="0-7">0-7 days</SelectItem>
                      <SelectItem value="7-14">7-14 days</SelectItem>
                      <SelectItem value="14-30">14-30 days</SelectItem>
                      <SelectItem value="30+">30+ days</SelectItem>
                      <SelectItem value="never">No touch logged</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Engagement level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All engagement</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="at-risk">At risk</SelectItem>
                      <SelectItem value="none">No data</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Next follow-up" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any status</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="dueWeek">Due this week</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="none">None scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[220px] sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={athleteSearchTerm}
                      onChange={(event) => setAthleteSearchTerm(event.target.value)}
                      placeholder="Search athletes..."
                      className="pl-9"
                    />
                  </div>
                  {athleteSearchTerm && (
                    <Button variant="ghost" size="sm" onClick={() => setAthleteSearchTerm("")}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    variant={showHighPriorityOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowHighPriorityOnly((prev) => !prev)}
                  >
                    High priority only
                  </Button>
                  <Button
                    variant={showStaleOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowStaleOnly((prev) => !prev)}
                  >
                    Stale 14+ days
                  </Button>
                  <Button
                    variant={showUntouchedOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowUntouchedOnly((prev) => !prev)}
                  >
                    No touches logged
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetEngagementFilters}>
                    Reset filters
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCreatingActivity(true)}
                    className="ml-auto"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Log activity
                  </Button>
                </div>
              </div>

              {bulkSelectionCount > 0 && (
                <div className="sticky top-20 z-30 rounded-xl border border-border/80 bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold">{bulkSelectionCount} selected</span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={handleBulkLogActivity} disabled={bulkSelectionCount === 0}>
                        Log activity
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleBulkScheduleFollowUps} disabled={bulkSelectionCount === 0}>
                        Schedule follow-ups
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleBulkSendMessage} disabled={bulkSelectionCount === 0}>
                        Send message
                      </Button>
                      <Select onValueChange={handleBulkMoveStage} disabled={bulkSelectionCount === 0}>
                        <SelectTrigger className="h-9 w-[150px] text-sm" disabled={bulkSelectionCount === 0}>
                          <SelectValue placeholder="Move to stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_ORDER.map((stage) => (
                            <SelectItem key={stage.id} value={stage.label}>
                              {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={handleBulkExport} disabled={bulkSelectionCount === 0}>
                        Export
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleBulkDeselect}>
                        Deselect all ✕
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border/70 bg-card/60 overflow-x-auto">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">
                        <Checkbox checked={isAllRowsSelected} onCheckedChange={toggleSelectAllRows} />
                      </th>
                      <th className="text-left px-4 py-3">Athlete</th>
                      <th className="text-left px-4 py-3">Stage</th>
                      <th className="text-left px-4 py-3">Rating</th>
                      <th className="text-left px-4 py-3">Last activity</th>
                      <th className="text-left px-4 py-3">Days since</th>
                      <th className="text-left px-4 py-3">Touches</th>
                      <th className="text-left px-4 py-3">Frequency</th>
                      <th className="text-left px-4 py-3">Engagement</th>
                      <th className="text-left px-4 py-3">Next follow-up</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEngagementRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No athletes match these filters yet.
                        </td>
                      </tr>
                    ) : (
                      sortedEngagementRows.map((row) => {
                        const isSelected = selectedEngagementIds.has(row.id)
                        const daysBadge = getDaysBadgeTone(row.daysSince)
                        const engagementBadge = getEngagementBadgeClasses(row.engagementLevel)
                        return (
                          <tr key={row.id} className="border-t border-border/50 hover:bg-muted/20">
                            <td className="px-4 py-4">
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleRowSelection(row.id)} />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{row.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {row.status === "noActivity" ? "No touches logged" : `${row.totalTouches} touches lifetime`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm">{row.stage}</td>
                            <td className="px-4 py-4 text-sm">{row.starRating ? `${row.starRating}★` : "—"}</td>
                            <td className="px-4 py-4">
                              {row.lastAction ? (
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {formatActionType(row.lastAction.action_type)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(row.lastAction.action_date)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No activity logged</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${daysBadge.className}`}>
                                {daysBadge.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold">{row.totalTouches}</div>
                              <div className="text-[11px] text-muted-foreground">{row.touchesLast30} last 30d</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold">{row.touchFrequency}/wk</div>
                              <div className="text-[11px] text-muted-foreground">Avg cadence</div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={`text-[11px] ${engagementBadge}`}>
                                {row.engagementLevel === "none" ? "None" : row.engagementLevel}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              {row.nextFollowUp ? (
                                <p
                                  className={`text-sm font-medium ${
                                    row.nextFollowUp.getTime() < Date.now() ? "text-red-500" : "text-foreground"
                                  }`}
                                >
                                  {formatDate(row.nextFollowUp)}
                                </p>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not scheduled</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setFocusedAthleteId(row.id)}
                                  aria-label={`View ${row.name} activity`}
                                >
                                  <List className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openScheduleForAthlete(row.id)}
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openScheduleForAthlete(row.id, "call")}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openScheduleForAthlete(row.id, "email")}
                                >
                                  <Mail className="h-4 w-4" />
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

            <Card className="border border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ActivityIcon className="h-4 w-4 text-primary" />
                  Activity timeline
                </CardTitle>
                <CardDescription>Last 50 activities logged across the staff.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivityTimeline.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="border-l-2 border-border/80 pl-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{activity.athlete_name}</span>
                      <span>{formatRelativeTimeFromNow(new Date(activity.action_date))}</span>
                    </div>
                    <p className="text-sm">
                      {formatActionType(activity.action_type)}
                      {activity.outcome ? ` • ${activity.outcome}` : ""}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Browse NC Rankings",
                  action: () => openExternal("https://app.ncwrestlingunited.com/public-rankings", "_blank"),
                  variant: "destructive" as const,
                },
                {
                  label: "Create New Prospect",
                  action: () => openExternal("/create-prospect", "_blank"),
                  variant: "destructive" as const,
                },
                {
                  label: "View Full Pipeline",
                  action: () => setTabValue("dashboard"),
                  variant: "outline" as const,
                },
                {
                  label: "Log Activity",
                  action: () => setCreatingActivity(true),
                  variant: "outline" as const,
                },
              ].map((quick) => (
                <Button
                  key={quick.label}
                  variant={quick.variant}
                  className="w-full h-12 text-sm font-semibold"
                  onClick={quick.action}
                >
                  {quick.label}
                </Button>
              ))}
            </div>
          </div>
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

      <Dialog open={!!focusedAthleteId} onOpenChange={(open) => !open && setFocusedAthleteId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {focusedAthlete?.name || "Athlete activity"}
            </DialogTitle>
            {focusedAthlete && (
              <p className="text-sm text-muted-foreground">
                {focusedAthlete.stage} • {focusedAthlete.totalTouches} lifetime touches •{" "}
                {focusedAthlete.daysSince === null ? "No touch logged" : `${focusedAthlete.daysSince} days since last touch`}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {focusedAthleteActions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No activity has been logged for this athlete yet.
              </div>
            ) : (
              focusedAthleteActions.map((activity) => (
                <Card key={activity.id} className="border border-border/70">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatActionType(activity.action_type)}</Badge>
                        <span className="text-muted-foreground">{activity.coach_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(activity.action_date)}</span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-foreground">{activity.description}</p>
                    )}
                    {activity.outcome && (
                      <p className="text-xs text-muted-foreground">
                        Outcome: {activity.outcome}
                      </p>
                    )}
                    {activity.follow_up_date && (
                      <p className="text-xs text-muted-foreground">
                        Follow-up: {formatDate(activity.follow_up_date)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          {focusedAthleteId && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <p className="text-sm text-muted-foreground">
                Logged {focusedAthleteActions.length} touch{focusedAthleteActions.length === 1 ? "" : "es"} for{" "}
                {focusedAthlete?.name ?? "this athlete"}.
              </p>
              <Button
                onClick={() => {
                  openScheduleForAthlete(focusedAthleteId)
                  setFocusedAthleteId(null)
                }}
              >
                Log new activity
              </Button>
            </div>
          )}
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
