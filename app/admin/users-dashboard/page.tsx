"use client"

import { useEffect, useMemo, useState } from "react"
import { formatPhoneForDisplay } from "@/lib/phone-format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { 
  Users, 
  UserCheck, 
  UserX, 
  School, 
  Phone, 
  Mail, 
  Calendar, 
  Clock,
  Edit,
  Check,
  X,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Activity,
  Download,
  ClipboardCopy,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts"

type UserProfile = {
  user_id: string
  name: string | null
  email: string
  role: string | null
  cell_phone: string | null
  created_at: string
  is_admin: boolean
  last_sign_in_at: string | null
  verified_coach: boolean | null
  verification_status: string | null
  school_id: string | null
  school_name: string | null
}

type CollegeOption = {
  id: string
  name: string
  division?: string | null
}


// Relative time formatting
function getRelativeTime(date: string | null): string {
  if (!date) return "Never"
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

/** Dedupe by lowercase; preserve first-seen casing (every Supabase auth account email). */
function uniqueMarketingEmails(rows: { email: string }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows) {
    const raw = (row.email || "").trim()
    if (!raw) continue
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(raw)
  }
  return out
}

export default function UsersDashboardPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [colleges, setColleges] = useState<CollegeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    cell_phone: "",
    role: "",
    verified_coach: false,
    school_id: "",
    college_id: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // CRITICAL: Check for rate limit cooldown BEFORE making API calls
      if (typeof window !== "undefined") {
        const rateLimitCookie = document.cookie
          .split("; ")
          .find((c) => c.startsWith("rate_limit_cooldown="))
        if (rateLimitCookie) {
          const cooldownValue = rateLimitCookie.split("=")[1]
          const cooldownTime = parseInt(cooldownValue, 10)
          // Cooldown is 2 minutes (120000ms) - reduced from 10 minutes
          if (cooldownTime && Date.now() < cooldownTime + 120000) {
            const remainingSeconds = Math.ceil((cooldownTime + 120000 - Date.now()) / 1000)
            const remainingMinutes = Math.ceil(remainingSeconds / 60)
            console.warn(`[UsersDashboard] Rate limit cooldown active (${remainingSeconds}s / ${remainingMinutes}m remaining), skipping API calls`)
            setError(`Rate limit cooldown active. Please wait ${remainingSeconds} seconds (${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}) more.`)
            setLoading(false)
            return // Don't make API calls during cooldown
          }
        }
      }

      setLoading(true)
      const [profilesRes, collegesRes] = await Promise.all([
        fetch("/api/admin/users/profiles", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/colleges", { cache: "no-store", credentials: "include" })
      ])

      if (!profilesRes.ok) throw new Error("Failed to load profiles")
      if (!collegesRes.ok) throw new Error("Failed to load colleges")

      const profilesData = await profilesRes.json()
      const collegesData = await collegesRes.json()

      setProfiles(profilesData.profiles || [])
      setColleges(collegesData.colleges || [])
    } catch (e: any) {
      console.error("Error loading dashboard:", e)
      setError(e?.message || "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (user: UserProfile) => {
    const matchingCollege = colleges.find(
      (college) => college.name.trim().toLowerCase() === (user.school_name || "").trim().toLowerCase(),
    )
    setEditingUser(user)
    setEditForm({
      name: user.name || "",
      cell_phone: user.cell_phone || "",
      role: user.role || "other",
      verified_coach: user.verified_coach || false,
      school_id: user.school_id || "",
      college_id: matchingCollege?.id || "",
    })
  }

  const handleSaveUser = async () => {
    if (!editingUser) {
      console.error("[Users Dashboard] No user selected for editing")
      return
    }

    if (saving) {
      console.log("[Users Dashboard] Save already in progress, ignoring click")
      return
    }

    setSaving(true)

    try {
      // Prepare the update payload
      const payload = {
        name: editForm.name,
        cell_phone: editForm.cell_phone,
        role: editForm.role,
        verified_coach: editForm.verified_coach,
        school_id: editForm.role === "college_coach" ? undefined : editForm.school_id === "unassigned" ? null : editForm.school_id,
        college_id: editForm.role === "college_coach"
          ? editForm.college_id === "unassigned" ? null : editForm.college_id
          : undefined,
      }

      console.log("[Users Dashboard] Saving user:", {
        userId: editingUser.user_id,
        payload
      })

      const res = await fetch(`/api/admin/users/${editingUser.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      })

      let responseData: any = {}
      try {
        const text = await res.text()
        responseData = text ? JSON.parse(text) : {}
      } catch (e) {
        console.error("[Users Dashboard] Failed to parse response:", e)
      }
      
      console.log("[Users Dashboard] FULL Response:", {
        status: res.status,
        ok: res.ok,
        statusText: res.statusText,
        fullData: responseData
      })

      if (!res.ok) {
        const errorMessage = responseData.details || responseData.error || responseData.message || `Failed to update user (${res.status})`
        console.error("[Users Dashboard] Update failed - FULL ERROR:", {
          message: errorMessage,
          fullResponse: JSON.stringify(responseData, null, 2),
          status: res.status,
          code: responseData.code,
          hint: responseData.hint
        })
        throw new Error(errorMessage)
      }

      toast({
        title: "Success",
        description: "User profile updated successfully"
      })

      // Update local state
      setProfiles(prev => prev.map(p => 
        p.user_id === editingUser.user_id 
          ? { 
              ...p, 
              name: editForm.name,
              cell_phone: editForm.cell_phone,
              role: editForm.role,
              verified_coach: editForm.verified_coach,
              school_id: responseData.profile?.school_id ?? payload.school_id ?? null,
              school_name:
                responseData.profile?.school_name ??
                (editForm.college_id && editForm.college_id !== "unassigned"
                  ? colleges.find((college) => college.id === editForm.college_id)?.name || null
                  : null),
            } 
          : p
      ))
      setEditingUser(null)
    } catch (e: any) {
      console.error("[Users Dashboard] Error saving user:", e)
      toast({
        title: "Error",
        description: e?.message || "Failed to update user",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleApproveCoach = async (userId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified_coach: approved }),
        credentials: "include"
      })

      if (!res.ok) throw new Error("Failed to update approval status")

      toast({
        title: "Success",
        description: approved ? "Coach approved" : "Coach approval revoked"
      })

      setProfiles(prev => prev.map(p => 
        p.user_id === userId ? { ...p, verified_coach: approved } : p
      ))
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to update approval",
        variant: "destructive"
      })
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/admin/users/export-csv", {
        method: "GET",
        credentials: "include"
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to export" }))
        throw new Error(errorData.error || "Failed to export users")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Users exported successfully"
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to export users",
        variant: "destructive"
      })
    }
  }

  /** Plain-text emails — avoids OS/browser “couldn’t load plugin” on CSV preview. */
  const handleExportEmailsTxt = async () => {
    try {
      const res = await fetch("/api/admin/users/export-csv?format=emails-txt", {
        method: "GET",
        credentials: "include"
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to export" }))
        throw new Error(errorData.error || "Failed to export emails")
      }

      const blob = await res.blob()
      const dlUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = dlUrl
      a.download = `recruitnc-account-emails-${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(dlUrl)
      document.body.removeChild(a)

      toast({
        title: "Downloaded",
        description: "Emails saved as .txt (one per line, deduped).",
      })
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to download emails",
        variant: "destructive"
      })
    }
  }

  const handleCopyMarketingEmails = async (format: "comma" | "newline") => {
    const emails = uniqueMarketingEmails(profiles)
    if (emails.length === 0) {
      toast({
        title: "Nothing to copy",
        description: "No loaded users with email addresses.",
        variant: "destructive",
      })
      return
    }
    const text = format === "comma" ? emails.join(", ") : emails.join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: `${emails.length} unique emails (${format === "comma" ? "comma-separated" : "one per line"}).`,
      })
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access was blocked. Try a secure (https) context or grant permission.",
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-30" />
    return sortDirection === "asc" ? 
      <ArrowUp className="h-3 w-3 ml-1 inline" /> : 
      <ArrowDown className="h-3 w-3 ml-1 inline" />
  }

  const filteredProfiles = useMemo(() => {
    let filtered = profiles

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.cell_phone?.includes(query) ||
        p.school_name?.toLowerCase().includes(query)
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(p => p.role === roleFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof UserProfile]
      let bVal: any = b[sortField as keyof UserProfile]

      // Handle null values
      if (aVal === null) aVal = ""
      if (bVal === null) bVal = ""

      // Convert to comparable types
      if (sortField === "created_at" || sortField === "last_sign_in_at") {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = bVal?.toLowerCase() || ""
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [profiles, searchQuery, roleFilter, sortField, sortDirection])

  const pendingCoaches = useMemo(() => 
    filteredProfiles.filter(p => 
      p.role === "college_coach" && !p.verified_coach && p.verification_status !== "rejected"
    ),
    [filteredProfiles]
  )

  const approvedCoaches = useMemo(() => 
    filteredProfiles.filter(p => 
      p.role === "college_coach" && p.verified_coach
    ),
    [filteredProfiles]
  )

  const stats = useMemo(() => ({
    total: profiles.length,
    coaches: profiles.filter(p => p.role === "college_coach").length,
    pendingCoaches: profiles.filter(p => p.role === "college_coach" && !p.verified_coach && p.verification_status !== "rejected").length,
    approvedCoaches: profiles.filter(p => p.role === "college_coach" && p.verified_coach).length,
    athletes: profiles.filter(p => p.role === "athlete").length,
    activeToday: profiles.filter(p => {
      if (!p.last_sign_in_at) return false
      const today = new Date().toDateString()
      return new Date(p.last_sign_in_at).toDateString() === today
    }).length
  }), [profiles])

  // Cumulative user growth over time
  const cumulativeGrowthData = useMemo(() => {
    if (!profiles.length) return []

    const countsByDay: { [key: string]: number } = {}
    let earliestDate: Date | null = null
    const now = new Date()

    profiles.forEach(p => {
      const created = new Date(p.created_at)
      // Ignore obviously bad dates
      if (Number.isNaN(created.getTime()) || created > now) return

      const day = new Date(created.toISOString().split("T")[0])
      const dateKey = day.toISOString().split("T")[0]
      countsByDay[dateKey] = (countsByDay[dateKey] || 0) + 1

      if (!earliestDate || day < earliestDate) {
        earliestDate = day
      }
    })

    if (!earliestDate) return []

    // Limit to the last 365 days to keep the chart readable
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    if (earliestDate < oneYearAgo) {
      earliestDate = oneYearAgo
    }

    const data: { date: string; totalUsers: number }[] = []
    let runningTotal = 0
    const cursor = new Date(earliestDate)

    while (cursor <= now) {
      const dateKey = cursor.toISOString().split("T")[0]
      runningTotal += countsByDay[dateKey] || 0

      data.push({
        date: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        totalUsers: runningTotal,
      })

      // Move to next day
      cursor.setDate(cursor.getDate() + 1)
    }

    return data
  }, [profiles])

  // Activity charts data
  const activityData = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Group signups by day
    const signupsByDay: { [key: string]: number } = {}
    const loginsByDay: { [key: string]: number } = {}
    
    profiles.forEach(p => {
      const signupDate = new Date(p.created_at)
      if (signupDate >= thirtyDaysAgo) {
        const dateKey = signupDate.toISOString().split('T')[0]
        signupsByDay[dateKey] = (signupsByDay[dateKey] || 0) + 1
      }
      
      if (p.last_sign_in_at) {
        const loginDate = new Date(p.last_sign_in_at)
        if (loginDate >= thirtyDaysAgo) {
          const dateKey = loginDate.toISOString().split('T')[0]
          loginsByDay[dateKey] = (loginsByDay[dateKey] || 0) + 1
        }
      }
    })
    
    // Create array of last 30 days
    const chartData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      chartData.push({
        date: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups: signupsByDay[dateKey] || 0,
        logins: loginsByDay[dateKey] || 0
      })
    }
    
    return chartData
  }, [profiles])

  const activityDistribution = useMemo(() => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    return [
      { 
        period: "Last 24 hours", 
        users: profiles.filter(p => p.last_sign_in_at && new Date(p.last_sign_in_at) >= oneDayAgo).length 
      },
      { 
        period: "Last 7 days", 
        users: profiles.filter(p => p.last_sign_in_at && new Date(p.last_sign_in_at) >= oneWeekAgo).length 
      },
      { 
        period: "Last 30 days", 
        users: profiles.filter(p => p.last_sign_in_at && new Date(p.last_sign_in_at) >= oneMonthAgo).length 
      },
      { 
        period: "Never", 
        users: profiles.filter(p => !p.last_sign_in_at).length 
      }
    ]
  }, [profiles])

  const UserRow = ({ user }: { user: UserProfile }) => {
    const isCoach = user.role === "college_coach"
    
    return (
      <tr key={user.user_id} className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div>
              <div className="font-medium text-gray-900">{user.name || "N/A"}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge 
            variant={
              user.role === "college_coach" ? "default" :
              user.role === "athlete" ? "secondary" :
              "outline"
            }
          >
            {user.role || "other"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm">
          {formatPhoneForDisplay(user.cell_phone) || "N/A"}
        </td>
        {isCoach && (
          <>
            <td className="px-4 py-3">
              {user.verified_coach ? (
                <Badge variant="default" className="bg-green-600">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              ) : user.verification_status === "rejected" ? (
                <Badge variant="outline" className="border-red-600 text-red-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </td>
            <td className="px-4 py-3 text-sm">
              {user.school_name || (
                <span className="text-gray-400 italic">Not assigned</span>
              )}
            </td>
          </>
        )}
        <td className="px-4 py-3 text-sm text-gray-500">
          {getRelativeTime(user.last_sign_in_at)}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {new Date(user.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <HardLink
              href={`/admin/users/${user.user_id}/crm`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
              title="CRM hub (read-only snapshot)"
            >
              <LayoutDashboard className="h-4 w-4" />
              Hub
            </HardLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(user)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {isCoach && (
              <Button
                variant={user.verified_coach ? "outline" : "default"}
                size="sm"
                onClick={() => handleApproveCoach(user.user_id, !user.verified_coach)}
                className={user.verified_coach ? "" : "bg-green-600 hover:bg-green-700"}
              >
                {user.verified_coach ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage user profiles, approve coaches, and assign college institutions</p>
          <p className="text-muted-foreground mt-2 max-w-xl text-xs">
            Marketing: copy or download emails (deduped). Use Emails (.txt) if CSV triggers a browser plugin error — same account list as CSV. Use only where you have consent or legitimate interest.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="flex items-center gap-2">
                <ClipboardCopy className="h-4 w-4" />
                Copy emails
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => void handleCopyMarketingEmails("comma")}>
                Comma-separated (e.g. Mailchimp)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleCopyMarketingEmails("newline")}>
                One email per line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleExportEmailsTxt} variant="outline" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails (.txt)
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Coaches</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingCoaches}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved Coaches</p>
                <p className="text-2xl font-bold text-green-600">{stats.approvedCoaches}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeToday}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Signups & Logins (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Signups"
                />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Logins"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              User Activity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8B5CF6" name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative User Growth */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Cumulative User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  stroke="#22C55E"
                  strokeWidth={2}
                  name="Total Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, phone, or school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="college_coach">College Coaches</SelectItem>
                <SelectItem value="athlete">Athletes</SelectItem>
                <SelectItem value="parent">Parents</SelectItem>
                <SelectItem value="coach">HS/Club Coaches</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Coaches
            {stats.pendingCoaches > 0 && (
              <Badge variant="destructive" className="ml-2">{stats.pendingCoaches}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved Coaches</TabsTrigger>
          <TabsTrigger value="all">All Users</TabsTrigger>
        </TabsList>

        {/* Pending Coaches */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Pending Coach Approvals ({pendingCoaches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingCoaches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending coach approvals
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("name")}
                        >
                          User <SortIcon field="name" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("role")}
                        >
                          Role <SortIcon field="role" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("cell_phone")}
                        >
                          Phone <SortIcon field="cell_phone" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("school_name")}
                        >
                          School <SortIcon field="school_name" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("last_sign_in_at")}
                        >
                          Last Active <SortIcon field="last_sign_in_at" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("created_at")}
                        >
                          Joined <SortIcon field="created_at" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pendingCoaches.map(user => <UserRow key={user.user_id} user={user} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Coaches */}
        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Approved Coaches ({approvedCoaches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedCoaches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No approved coaches yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("name")}
                        >
                          User <SortIcon field="name" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("role")}
                        >
                          Role <SortIcon field="role" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("cell_phone")}
                        >
                          Phone <SortIcon field="cell_phone" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("school_name")}
                        >
                          School <SortIcon field="school_name" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("last_sign_in_at")}
                        >
                          Last Active <SortIcon field="last_sign_in_at" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("created_at")}
                        >
                          Joined <SortIcon field="created_at" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {approvedCoaches.map(user => <UserRow key={user.user_id} user={user} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Users */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredProfiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("name")}
                      >
                        User <SortIcon field="name" />
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("role")}
                      >
                        Role <SortIcon field="role" />
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("cell_phone")}
                      >
                        Phone <SortIcon field="cell_phone" />
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("last_sign_in_at")}
                      >
                        Last Active <SortIcon field="last_sign_in_at" />
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("created_at")}
                      >
                        Joined <SortIcon field="created_at" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProfiles.map(user => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{user.name || "N/A"}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === "college_coach" ? "default" : "outline"}>
                            {user.role || "other"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatPhoneForDisplay(user.cell_phone) || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {getRelativeTime(user.last_sign_in_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <HardLink
                              href={`/admin/users/${user.user_id}/crm`}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
                              title="CRM hub (read-only snapshot)"
                            >
                              <LayoutDashboard className="h-4 w-4" />
                              Hub
                            </HardLink>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Email (read-only)</Label>
                <Input value={editingUser.email} disabled />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Cell Phone</Label>
                <Input
                  value={editForm.cell_phone}
                  onChange={(e) => setEditForm({ ...editForm, cell_phone: e.target.value })}
                  placeholder="(XXX) XXX-XXXX"
                />
                <p className="text-xs text-gray-500 mt-1">Will be formatted automatically</p>
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athlete">Athlete</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="college_coach">College Coach</SelectItem>
                    <SelectItem value="coach">High School/Club Coach</SelectItem>
                    <SelectItem value="referee">Referee</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.role === "college_coach" && (
                <>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="verified_coach"
                      checked={editForm.verified_coach}
                      onChange={(e) => setEditForm({ ...editForm, verified_coach: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="verified_coach">Coach Approved (can access athlete contact info)</Label>
                  </div>
                  <div>
                    <Label>Assign to College</Label>
                    <Select
                      value={editForm.college_id || "unassigned"}
                      onValueChange={(value) => setEditForm({ ...editForm, college_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a college..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">None</SelectItem>
                        {colleges.map(college => (
                          <SelectItem key={college.id} value={college.id}>
                            {college.name}{college.division ? ` — ${college.division}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSaveUser()
                  }}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
