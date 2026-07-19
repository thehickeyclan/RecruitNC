"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Activity, ArrowLeft, CalendarDays, CheckCircle2, Clock, DollarSign, FileText, LayoutGrid, LinkIcon, MessageSquare, Paperclip, Plus, Save, Send, ShieldCheck, Trash2, Upload, UserPlus, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TOC_EVENT_DATE, TOC_EVENT_DATES_RANGE } from "@/lib/toc/constants"
import { TOC_PROJECT_CATEGORIES, type TocProjectActivity, type TocProjectApproval, type TocProjectChatMessage, type TocProjectDocument, type TocProjectTask, type TocProjectUser, type TocTaskAssignee, type TocTaskLink } from "@/lib/toc/project-plan"

type Payload = {
  unavailable?: boolean
  setupSql?: string
  currentUser?: { userId: string; email: string }
  tasks: TocProjectTask[]
  error?: string
}

type DocumentsPayload = {
  unavailable?: boolean
  setupSql?: string
  documents: TocProjectDocument[]
  error?: string
}

type ChatPayload = {
  unavailable?: boolean
  setupSql?: string
  messages: TocProjectChatMessage[]
  error?: string
}

type ActivityPayload = {
  unavailable?: boolean
  setupSql?: string
  activity: TocProjectActivity[]
  error?: string
}

type ApprovalsPayload = {
  unavailable?: boolean
  setupSql?: string
  approvals: TocProjectApproval[]
  error?: string
}

type ApprovalDraft = {
  title: string
  body: string
  vendor: string
  amount: string
  neededBy: string
  links: string
  file: File | null
}

type FieldPayload = {
  board?: {
    summary?: {
      totalConfirmed?: number
      totalInvited?: number
      fullBrackets?: number
      partialBrackets?: number
    }
    weights?: Array<{ maxSlots?: number; confirmedCount?: number }>
  }
  error?: string
}

const STATUS_LABEL: Record<string, string> = {
  todo: "Not started",
  in_progress: "On target",
  blocked: "At risk",
  done: "Completed",
}

const STATUS_CLASS: Record<string, string> = {
  todo: "bg-slate-700/80 text-slate-100 border border-white/10",
  in_progress: "bg-blue-500/20 text-blue-100 border border-blue-300/30",
  blocked: "bg-amber-400/20 text-amber-100 border border-amber-300/35",
  done: "bg-emerald-400/20 text-emerald-100 border border-emerald-300/35",
}

const APPROVAL_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Rejected",
}

const APPROVAL_CLASS: Record<string, string> = {
  pending: "border-amber-300/35 bg-amber-400/15 text-amber-100",
  approved: "border-emerald-300/35 bg-emerald-400/15 text-emerald-100",
  changes_requested: "border-blue-300/35 bg-blue-400/15 text-blue-100",
  rejected: "border-red-300/35 bg-red-500/15 text-red-100",
}

const DARK_FIELD_CLASS = "border-slate-400/40 bg-slate-950/35 text-white placeholder:text-slate-300 shadow-inner shadow-black/20 focus-visible:border-[#D6B65A] focus-visible:ring-[#D6B65A]/35"
const DARK_FIELD_SMALL_CLASS = `h-9 ${DARK_FIELD_CLASS}`
const DARK_SELECT_CLASS = `h-9 ${DARK_FIELD_CLASS}`

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "$0"
  return Number(value).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function formatCurrencyInput(value: number | string | null | undefined): string {
  if (value == null || value === "") return ""
  const numeric = typeof value === "number" ? value : parseCurrencyInput(value)
  if (numeric == null) return ""
  return numeric.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseCurrencyInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "")
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeCurrencyInput(value: string): string {
  const numeric = parseCurrencyInput(value)
  return numeric == null ? "" : formatCurrencyInput(numeric)
}

function assigneeDisplayName(assignee: TocTaskAssignee): string {
  if (assignee.name && assignee.name !== assignee.email) return assignee.name
  if (assignee.email) return assignee.email.split("@")[0].replace(/[._-]+/g, " ")
  return "Owner"
}

function assigneeTooltip(assignee: TocTaskAssignee): string {
  const name = assigneeDisplayName(assignee)
  return assignee.email ? `${name} · ${assignee.email}` : name
}

function parseLinks(value: string): TocTaskLink[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|")
      const url = (rest.join("|") || label).trim()
      return { label: (rest.length ? label : url).trim(), url }
    })
    .filter((l) => l.url.startsWith("http") || l.url.startsWith("/"))
}

function linksText(rows: TocTaskLink[]): string {
  return rows.map((l) => `${l.label || l.url}|${l.url}`).join("\n")
}

function categoryMeta(category: string) {
  return TOC_PROJECT_CATEGORIES.find((c) => c.name === category) ?? TOC_PROJECT_CATEGORIES[0]
}

function ownerInitials(value: string): string {
  const clean = value.replace(/<.*?>/g, "").trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return clean.slice(0, 2).toUpperCase() || "?"
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatFileSize(value: number | null | undefined): string {
  if (!value) return "Unknown size"
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function activityIconClass(actionType: string): string {
  if (actionType.includes("deleted") || actionType.includes("blocked")) return "bg-red-500/15 text-red-200 ring-red-300/20"
  if (actionType.includes("comment") || actionType.includes("chat")) return "bg-blue-500/15 text-blue-200 ring-blue-300/20"
  if (actionType.includes("document") || actionType.includes("attachment")) return "bg-amber-400/15 text-amber-100 ring-amber-300/20"
  if (actionType.includes("created")) return "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20"
  return "bg-white/10 text-white ring-white/15"
}

function activityDetails(details: Record<string, unknown> | null | undefined): string | null {
  if (!details) return null
  const changes = details.changes
  if (Array.isArray(changes)) {
    return changes
      .map((change) => {
        if (!change || typeof change !== "object") return null
        const row = change as { label?: string; from?: string; to?: string }
        return `${row.label ?? "field"}: ${row.from || "blank"} → ${row.to || "blank"}`
      })
      .filter(Boolean)
      .join(" · ")
  }
  const comment = typeof details.comment === "string" ? details.comment : null
  if (comment) return comment.length > 180 ? `${comment.slice(0, 180)}…` : comment
  const message = typeof details.message === "string" ? details.message : null
  if (message) return message.length > 180 ? `${message.slice(0, 180)}…` : message
  const fileName = typeof details.fileName === "string" ? details.fileName : null
  if (fileName) return fileName
  return null
}

function aiMetaText(doc: TocProjectDocument, key: string): string | null {
  const value = doc.ai_metadata?.[key]
  if (value == null || value === "") return null
  if (typeof value === "number") return key.toLowerCase().includes("amount") ? money(value) : String(value)
  if (Array.isArray(value)) return value.filter(Boolean).map(String).slice(0, 4).join(" · ") || null
  return String(value)
}

function emptyApprovalDraft(taskTitle?: string): ApprovalDraft {
  return {
    title: taskTitle ? `Approval needed: ${taskTitle}` : "",
    body: "",
    vendor: "",
    amount: "",
    neededBy: "",
    links: "",
    file: null,
  }
}

function approvalIcon(status: string) {
  if (status === "approved") return <CheckCircle2 className="h-4 w-4" />
  if (status === "rejected") return <XCircle className="h-4 w-4" />
  if (status === "changes_requested") return <MessageSquare className="h-4 w-4" />
  return <Clock className="h-4 w-4" />
}

function tournamentCountdown() {
  const target = TOC_EVENT_DATE.getTime()
  const now = Date.now()
  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  return { days, hours }
}

export default function TocProjectPlanPage() {
  const [tasks, setTasks] = useState<TocProjectTask[]>([])
  const [documents, setDocuments] = useState<TocProjectDocument[]>([])
  const [approvals, setApprovals] = useState<TocProjectApproval[]>([])
  const [chatMessages, setChatMessages] = useState<TocProjectChatMessage[]>([])
  const [activityFeed, setActivityFeed] = useState<TocProjectActivity[]>([])
  const [bracketFill, setBracketFill] = useState({ confirmed: 0, capacity: 88, pct: 0, fullBrackets: 0 })
  const [currentUser, setCurrentUser] = useState<{ userId: string; email: string } | null>(null)
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [documentsUnavailable, setDocumentsUnavailable] = useState<string | null>(null)
  const [approvalsUnavailable, setApprovalsUnavailable] = useState<string | null>(null)
  const [chatUnavailable, setChatUnavailable] = useState<string | null>(null)
  const [activityUnavailable, setActivityUnavailable] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [sendingChat, setSendingChat] = useState(false)
  const [seedingTasks, setSeedingTasks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({})
  const [chatDraft, setChatDraft] = useState("")
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [taskFilter, setTaskFilter] = useState<"all" | "mine">("all")
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("all")
  const [taskStatusFilter, setTaskStatusFilter] = useState("all")
  const [taskOwnerFilter, setTaskOwnerFilter] = useState("all")
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all")
  const [taskSearch, setTaskSearch] = useState("")
  const [ownerSearch, setOwnerSearch] = useState<Record<string, string>>({})
  const [ownerSuggestions, setOwnerSuggestions] = useState<Record<string, TocProjectUser[]>>({})
  const [ownerSearchLoading, setOwnerSearchLoading] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, TocProjectTask>>({})
  const [docTitle, setDocTitle] = useState("")
  const [docCategory, setDocCategory] = useState("Receipts")
  const [docVendor, setDocVendor] = useState("")
  const [docAmount, setDocAmount] = useState("")
  const [docDescription, setDocDescription] = useState("")
  const [docFile, setDocFile] = useState<File | null>(null)
  const [approvalDrafts, setApprovalDrafts] = useState<Record<string, ApprovalDraft>>({})
  const [approvalDecisionNotes, setApprovalDecisionNotes] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    setUnavailable(null)
    setDocumentsUnavailable(null)
    setApprovalsUnavailable(null)
    setChatUnavailable(null)
    setActivityUnavailable(null)
    try {
      const tasksRes = await fetch("/api/admin/toc/project-tasks", { cache: "no-store", credentials: "include" })
      const data = (await tasksRes.json()) as Payload
      if (!tasksRes.ok) throw new Error(data.error || "Could not load TOC project plan")
      setTasks(data.tasks ?? [])
      setCurrentUser(data.currentUser ?? null)
      setUnavailable(data.unavailable ? `Database table missing. Run ${data.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable shared editing.` : null)
      setDrafts(Object.fromEntries((data.tasks ?? []).map((task) => [task.id, task])))

      const [documentsRes, approvalsRes, chatRes, activityRes, fieldRes] = await Promise.allSettled([
        fetch("/api/admin/toc/project-documents", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/toc/project-approvals", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/toc/project-chat", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/toc/project-activity", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/toc/field", { cache: "no-store", credentials: "include" }),
      ])

      if (documentsRes.status === "fulfilled") {
        const documentsData = (await documentsRes.value.json()) as DocumentsPayload
        if (documentsRes.value.ok) {
          setDocuments(documentsData.documents ?? [])
          setDocumentsUnavailable(documentsData.unavailable ? `Document share missing. Run ${documentsData.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable uploads.` : null)
        } else {
          setDocumentsUnavailable(documentsData.error || "Document share could not load.")
        }
      } else {
        setDocumentsUnavailable("Document share could not load. The task board is still available.")
      }

      if (approvalsRes.status === "fulfilled") {
        const approvalsData = (await approvalsRes.value.json()) as ApprovalsPayload
        if (approvalsRes.value.ok) {
          setApprovals(approvalsData.approvals ?? [])
          setApprovalsUnavailable(approvalsData.unavailable ? `Approval center missing. Run ${approvalsData.setupSql ?? "docs/sql/toc-project-plan-live-patch.sql.txt"} in Supabase to enable approvals.` : null)
        } else {
          setApprovalsUnavailable(approvalsData.error || "Approval center could not load.")
        }
      } else {
        setApprovalsUnavailable("Approval center could not load. The task board is still available.")
      }

      if (chatRes.status === "fulfilled") {
        const chatData = (await chatRes.value.json()) as ChatPayload
        if (chatRes.value.ok) {
          setChatMessages(chatData.messages ?? [])
          setChatUnavailable(chatData.unavailable ? `Team chat missing. Run ${chatData.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable messages.` : null)
        } else {
          setChatUnavailable(chatData.error || "Team chat could not load.")
        }
      } else {
        setChatUnavailable("Team chat could not load. The task board is still available.")
      }

      if (activityRes.status === "fulfilled") {
        const activityData = (await activityRes.value.json()) as ActivityPayload
        if (activityRes.value.ok) {
          setActivityFeed(activityData.activity ?? [])
          setActivityUnavailable(activityData.unavailable ? `Activity feed missing. Run ${activityData.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable audit history.` : null)
        } else {
          setActivityUnavailable(activityData.error || "Activity feed could not load.")
        }
      } else {
        setActivityUnavailable("Activity feed could not load. The task board is still available.")
      }

      if (fieldRes.status === "fulfilled" && fieldRes.value.ok) {
        const fieldData = (await fieldRes.value.json()) as FieldPayload
        const weights = fieldData.board?.weights ?? []
        const capacity = weights.reduce((sum, weight) => sum + Number(weight.maxSlots ?? 0), 0) || 88
        const confirmed = Number(fieldData.board?.summary?.totalConfirmed ?? weights.reduce((sum, weight) => sum + Number(weight.confirmedCount ?? 0), 0))
        setBracketFill({
          confirmed,
          capacity,
          pct: capacity ? Math.round((confirmed / capacity) * 100) : 0,
          fullBrackets: Number(fieldData.board?.summary?.fullBrackets ?? 0),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load TOC project plan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const summary = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "done").length
    const blocked = tasks.filter((t) => t.status === "blocked").length
    const budget = tasks.reduce((sum, t) => sum + Number(t.budget_amount ?? 0), 0)
    const actual = tasks.reduce((sum, t) => sum + Number(t.actual_amount ?? 0), 0)
    return { total, done, blocked, budget, actual, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [tasks])

  const countdown = useMemo(() => tournamentCountdown(), [])
  const documentTotal = useMemo(() => documents.reduce((sum, doc) => sum + Number(doc.amount ?? 0), 0), [documents])
  const approvalSummary = useMemo(() => {
    const pending = approvals.filter((approval) => approval.status === "pending").length
    const approved = approvals.filter((approval) => approval.status === "approved").length
    const needsWork = approvals.filter((approval) => approval.status === "changes_requested").length
    return { pending, approved, needsWork, total: approvals.length }
  }, [approvals])
  const ownerOptions = useMemo(() => {
    const rows = new Map<string, { value: string; label: string }>()
    tasks.forEach((task) => {
      ;(task.assignees ?? []).forEach((assignee) => {
        const value = (assignee.email || assignee.name || "").trim().toLowerCase()
        const label = assigneeDisplayName(assignee)
        if (value && label) rows.set(value, { value, label })
      })
    })
    return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const search = taskSearch.trim().toLowerCase()
    return tasks.filter((task) => {
      if (taskFilter === "mine" && !isMyTask(task)) return false
      if (taskCategoryFilter !== "all" && task.category !== taskCategoryFilter) return false
      if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false
      if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false
      if (taskOwnerFilter !== "all") {
        if (taskOwnerFilter === "__unassigned__") return (task.assignees ?? []).length === 0
        const ownerMatch = (task.assignees ?? []).some((assignee) => {
          const email = assignee.email?.trim().toLowerCase()
          const name = assignee.name?.trim().toLowerCase()
          return email === taskOwnerFilter || name === taskOwnerFilter
        })
        if (!ownerMatch) return false
      }
      if (search) {
        const haystack = [
          task.title,
          task.category,
          task.notes,
          task.priority,
          STATUS_LABEL[task.status],
          ...(task.assignees ?? []).flatMap((assignee) => [assignee.name, assignee.email]),
        ].filter(Boolean).join(" ").toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  }, [tasks, taskFilter, taskCategoryFilter, taskStatusFilter, taskPriorityFilter, taskOwnerFilter, taskSearch, currentUser])

  const activeFilterCount = [
    taskFilter === "mine",
    taskCategoryFilter !== "all",
    taskStatusFilter !== "all",
    taskOwnerFilter !== "all",
    taskPriorityFilter !== "all",
    !!taskSearch.trim(),
  ].filter(Boolean).length

  function updateDraft(id: string, patch: Partial<TocProjectTask>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? tasks.find((t) => t.id === id)!), ...patch } }))
  }

  function approvalDraftFor(task: TocProjectTask): ApprovalDraft {
    return approvalDrafts[task.id] ?? emptyApprovalDraft(task.title)
  }

  function updateApprovalDraft(task: TocProjectTask, patch: Partial<ApprovalDraft>) {
    setApprovalDrafts((prev) => ({
      ...prev,
      [task.id]: { ...(prev[task.id] ?? emptyApprovalDraft(task.title)), ...patch },
    }))
  }

  function isMyTask(task: TocProjectTask): boolean {
    if (!currentUser) return false
    return (task.assignees ?? []).some((assignee) => {
      const emailMatch = assignee.email?.trim().toLowerCase() === currentUser.email.toLowerCase()
      const userMatch = assignee.userId === currentUser.userId
      return emailMatch || userMatch
    })
  }

  function resetTaskFilters() {
    setTaskFilter("all")
    setTaskCategoryFilter("all")
    setTaskStatusFilter("all")
    setTaskOwnerFilter("all")
    setTaskPriorityFilter("all")
    setTaskSearch("")
  }

  async function searchOwner(taskId: string, query: string) {
    setOwnerSearch((prev) => ({ ...prev, [taskId]: query }))
    if (query.trim().length < 2) {
      setOwnerSuggestions((prev) => ({ ...prev, [taskId]: [] }))
      return
    }
    setOwnerSearchLoading((prev) => ({ ...prev, [taskId]: true }))
    try {
      const res = await fetch(`/api/admin/toc/project-users?q=${encodeURIComponent(query)}`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) setOwnerSuggestions((prev) => ({ ...prev, [taskId]: data.users ?? [] }))
    } finally {
      setOwnerSearchLoading((prev) => ({ ...prev, [taskId]: false }))
    }
  }

  function addOwnerFromUser(task: TocProjectTask, user: TocProjectUser) {
    const existing = task.assignees ?? []
    if (existing.some((assignee) => assignee.userId === user.userId || assignee.email?.toLowerCase() === user.email.toLowerCase())) return
    updateDraft(task.id, {
      assignees: [...existing, { name: user.name, email: user.email, userId: user.userId }],
    })
    setOwnerSearch((prev) => ({ ...prev, [task.id]: "" }))
    setOwnerSuggestions((prev) => ({ ...prev, [task.id]: [] }))
  }

  function removeOwner(task: TocProjectTask, assigneeToRemove: TocTaskAssignee) {
    updateDraft(task.id, {
      assignees: (task.assignees ?? []).filter((assignee) => {
        if (assigneeToRemove.userId) return assignee.userId !== assigneeToRemove.userId
        if (assigneeToRemove.email) return assignee.email?.toLowerCase() !== assigneeToRemove.email.toLowerCase()
        return assignee.name !== assigneeToRemove.name
      }),
    })
  }

  async function seedMasterTasks() {
    setSeedingTasks(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/project-tasks/seed", { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Seed failed")
      setTasks(data.tasks ?? [])
      setDrafts(Object.fromEntries((data.tasks ?? []).map((task: TocProjectTask) => [task.id, task])))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed")
    } finally {
      setSeedingTasks(false)
    }
  }

  async function saveTask(id: string) {
    const draft = drafts[id]
    if (!draft || id.startsWith("seed-")) return
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/toc/project-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)))
      setDrafts((prev) => ({ ...prev, [id]: data.task }))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSavingId(null)
    }
  }

  async function addTask(category: string) {
    const title = (newTaskTitle[category] || "").trim()
    if (!title) return
    setSavingId(`new-${category}`)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/project-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category, title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add task")
      setTasks((prev) => [...prev, data.task].sort((a, b) => a.sort_order - b.sort_order))
      setDrafts((prev) => ({ ...prev, [data.task.id]: data.task }))
      setNewTaskTitle((prev) => ({ ...prev, [category]: "" }))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add task")
    } finally {
      setSavingId(null)
    }
  }

  async function deleteTask(id: string) {
    if (id.startsWith("seed-")) return
    if (!confirm("Delete this TOC task?")) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/toc/project-tasks/${id}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      setTasks((prev) => prev.filter((t) => t.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setSavingId(null)
    }
  }

  async function uploadAttachment(taskId: string, file: File | null) {
    if (!file || taskId.startsWith("seed-")) return
    const form = new FormData()
    form.set("file", file)
    setSavingId(taskId)
    try {
      const res = await fetch(`/api/admin/toc/project-tasks/${taskId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)))
      setDrafts((prev) => ({ ...prev, [taskId]: data.task }))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setSavingId(null)
    }
  }

  async function requestApproval(task: TocProjectTask) {
    const draft = approvalDraftFor(task)
    const title = draft.title.trim()
    if (!title || task.id.startsWith("seed-")) return
    setSavingId(`approval-${task.id}`)
    setError(null)
    try {
      const form = new FormData()
      form.set("taskId", task.id)
      form.set("category", task.category)
      form.set("title", title)
      form.set("body", draft.body)
      form.set("vendor", draft.vendor)
      form.set("amount", draft.amount)
      form.set("neededBy", draft.neededBy)
      form.set("links", draft.links)
      if (draft.file) form.append("files", draft.file)
      const res = await fetch("/api/admin/toc/project-approvals", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Approval request failed")
      setApprovals((prev) => [data.approval, ...prev])
      setApprovalDrafts((prev) => ({ ...prev, [task.id]: emptyApprovalDraft(task.title) }))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval request failed")
    } finally {
      setSavingId(null)
    }
  }

  async function decideApproval(approval: TocProjectApproval, status: TocProjectApproval["status"]) {
    setSavingId(`approval-decision-${approval.id}`)
    setError(null)
    try {
      const response_note = approvalDecisionNotes[approval.id] ?? ""
      const res = await fetch(`/api/admin/toc/project-approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, response_note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Approval update failed")
      setApprovals((prev) => prev.map((item) => (item.id === approval.id ? data.approval : item)))
      setApprovalDecisionNotes((prev) => ({ ...prev, [approval.id]: "" }))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval update failed")
    } finally {
      setSavingId(null)
    }
  }

  async function uploadSharedDocument() {
    if (!docFile) return
    setUploadingDocument(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("file", docFile)
      form.set("title", docTitle.trim() || docFile.name)
      form.set("category", docCategory)
      form.set("vendor", docVendor)
      form.set("description", docDescription)
      form.set("amount", docAmount)
      const res = await fetch("/api/admin/toc/project-documents", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setDocuments((prev) => [data.document, ...prev])
      setDocTitle("")
      setDocVendor("")
      setDocAmount("")
      setDocDescription("")
      setDocFile(null)
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingDocument(false)
    }
  }

  async function deleteSharedDocument(id: string) {
    if (!confirm("Delete this shared TOC document?")) return
    setSavingId(`document-${id}`)
    setError(null)
    try {
      const res = await fetch(`/api/admin/toc/project-documents/${id}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setSavingId(null)
    }
  }

  async function sendChatMessage() {
    const body = chatDraft.trim()
    if (!body) return
    setSendingChat(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/project-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Message failed")
      setChatMessages((prev) => [...prev, data.message])
      setChatDraft("")
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message failed")
    } finally {
      setSendingChat(false)
    }
  }

  async function addComment(taskId: string) {
    const body = (commentDrafts[taskId] || "").trim()
    if (!body || taskId.startsWith("seed-")) return
    setSavingId(taskId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/toc/project-tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Comment failed")
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)))
      setDrafts((prev) => ({ ...prev, [taskId]: data.task }))
      setCommentDrafts((prev) => ({ ...prev, [taskId]: "" }))
      void refreshActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comment failed")
    } finally {
      setSavingId(null)
    }
  }

  function selfAssign(task: TocProjectTask) {
    if (!currentUser) return
    const existing = task.assignees ?? []
    if (existing.some((a) => a.email?.toLowerCase() === currentUser.email.toLowerCase() || a.userId === currentUser.userId)) return
    const fallbackName = currentUser.email.split("@")[0].replace(/[._-]+/g, " ")
    updateDraft(task.id, { assignees: [...existing, { name: fallbackName, email: currentUser.email, userId: currentUser.userId }] })
  }

  async function refreshActivity() {
    try {
      const res = await fetch("/api/admin/toc/project-activity", { cache: "no-store", credentials: "include" })
      const data = (await res.json()) as ActivityPayload
      if (res.ok) {
        setActivityFeed(data.activity ?? [])
        setActivityUnavailable(data.unavailable ? `Activity feed missing. Run ${data.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable audit history.` : null)
      }
    } catch {
      // Non-blocking: activity should never break the board.
    }
  }

  async function refreshApprovals() {
    try {
      const res = await fetch("/api/admin/toc/project-approvals", { cache: "no-store", credentials: "include" })
      const data = (await res.json()) as ApprovalsPayload
      if (res.ok) {
        setApprovals(data.approvals ?? [])
        setApprovalsUnavailable(data.unavailable ? `Approval center missing. Run ${data.setupSql ?? "docs/sql/toc-project-plan-live-patch.sql.txt"} in Supabase to enable approvals.` : null)
      }
    } catch {
      // Non-blocking.
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading TOC project plan…</div>

  return (
    <div className="mx-auto max-w-7xl space-y-6 rounded-[2rem] bg-[#061426] p-4 text-slate-100 shadow-2xl shadow-slate-950/20 md:p-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-r from-[#07182e] via-[#092143] to-[#061426] p-5 shadow-lg shadow-black/20 backdrop-blur md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/admin/toc" className="mb-2 inline-flex items-center gap-2 text-sm text-[#D6B65A] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            TOC dashboard
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white">Tournament of Champions Project Plan</h1>
          <p className="mt-1 text-slate-300">Shared task board for operations, competition, marketing, sponsors, fan experience, and special events.</p>
        </div>
        <Button onClick={() => void load()} variant="outline" className="border-[#D6B65A]/60 bg-[#D6B65A]/10 text-[#D6B65A] hover:bg-[#D6B65A]/20 hover:text-white">Refresh</Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {unavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{unavailable}</div>}
      {documentsUnavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{documentsUnavailable}</div>}
      {approvalsUnavailable && <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">{approvalsUnavailable}</div>}
      {chatUnavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{chatUnavailable}</div>}
      {activityUnavailable && <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">{activityUnavailable}</div>}

      <Card className="overflow-hidden border-white/10 bg-gradient-to-r from-[#002147] to-[#0b3a6d] text-white shadow-lg shadow-black/20">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D6B65A]">
              <CalendarDays className="h-3.5 w-3.5" /> Tournament countdown
            </div>
            <h2 className="text-2xl font-bold">Tournament of Champions · {TOC_EVENT_DATES_RANGE}</h2>
            <p className="mt-1 text-sm text-white/75">Keep the team focused on contracts, field, sponsors, venue, and fan experience before event weekend.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <Badge key={value} className={`${STATUS_CLASS[value]} hover:bg-inherit`}>{label}</Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
              <div className="text-4xl font-black leading-none">{countdown.days}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/70">days</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
              <div className="text-4xl font-black leading-none">{countdown.hours}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/70">hours</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-[#07182e] shadow-lg shadow-black/20">
        <CardHeader className="border-b border-white/10 bg-gradient-to-r from-[#0b2344] via-[#092143] to-[#061426] pb-3 text-white">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#D6B65A]" />
              TOC Command Thread
            </span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/20 text-slate-200">{chatMessages.length} messages</Badge>
              <Badge variant="outline" className="border-white/20 text-slate-200">{activityFeed.length} activity items</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-gradient-to-br from-[#061426] to-[#0a1d37] p-4">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="mb-4 grid w-full max-w-md grid-cols-2 border border-white/10 bg-white/5">
              <TabsTrigger value="chat" className="data-[state=active]:bg-[#D6B65A] data-[state=active]:text-[#061426]">Chat</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-[#D6B65A] data-[state=active]:text-[#061426]">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-0 grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-3">
                {chatMessages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
                    No team chat yet. Use this like the TOC GroupMe thread for quick updates, blockers, reminders, and decisions.
                  </div>
                ) : (
                  chatMessages.map((message) => {
                    const isMine = currentUser?.email?.toLowerCase() === message.author_email?.toLowerCase()
                    return (
                      <div key={message.id} className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                        {!isMine && (
                          <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D6B65A] text-xs font-bold text-[#061426]">
                            {ownerInitials(message.author_email)}
                          </span>
                        )}
                        <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMine ? "bg-[#D6B65A] text-[#061426]" : "bg-white/10 text-slate-100"}`}>
                          <div className={`mb-1 text-[11px] ${isMine ? "text-[#061426]/70" : "text-slate-400"}`}>
                            {isMine ? "You" : message.author_email} · {formatDateTime(message.created_at)}
                          </div>
                          <p className="whitespace-pre-wrap">{message.body}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-sm font-semibold text-white">Post to the team</div>
                <Textarea
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder="Drop a quick TOC update…"
                className={`min-h-28 ${DARK_FIELD_CLASS}`}
                  disabled={!!chatUnavailable || sendingChat}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Visible to TOC scoped users on this page.</p>
                  <Button onClick={() => void sendChatMessage()} disabled={!!chatUnavailable || sendingChat || !chatDraft.trim()} className="bg-[#D6B65A] text-[#061426] hover:bg-[#c8a94f]">
                    <Send className="mr-2 h-4 w-4" /> {sendingChat ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-3">
                {activityFeed.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
                    No activity yet. Once the team changes statuses, adds notes, uploads docs, comments, or assigns owners, the audit trail will appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityFeed.map((item) => {
                      const details = activityDetails(item.details)
                      return (
                        <div key={item.id} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                          <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${activityIconClass(item.action_type)}`}>
                            <Activity className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white">{item.actor_email}</span>
                              {item.category && <Badge variant="outline" className="border-white/15 text-slate-300">{item.category}</Badge>}
                              <span className="text-xs text-slate-500">{formatDateTime(item.created_at)}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-200">{item.summary}</p>
                            {details && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{details}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Card className="border-white/10 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Tasks</p><p className="text-3xl font-black text-white">{summary.total}</p></CardContent></Card>
        <Card className="border-emerald-300/20 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Complete</p><p className="text-3xl font-black text-emerald-200">{summary.done}</p></CardContent></Card>
        <Card className="border-sky-300/20 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Task progress</p><p className="text-3xl font-black text-sky-200">{summary.pct}%</p></CardContent></Card>
        <Card className="border-amber-300/20 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-200">At risk</p><p className="text-3xl font-black text-amber-200">{summary.blocked}</p></CardContent></Card>
        <Card className="border-indigo-300/20 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-indigo-200"><LayoutGrid className="h-3.5 w-3.5" /> Bracket fill</p><p className="text-3xl font-black text-indigo-100">{bracketFill.pct}%</p><p className="text-xs text-slate-400">{bracketFill.confirmed}/{bracketFill.capacity} confirmed · {bracketFill.fullBrackets} full</p></CardContent></Card>
        <Card className="border-[#D6B65A]/30 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#D6B65A]">Budget / Actual</p><p className="text-xl font-black text-white">{money(summary.budget)} / {money(summary.actual)}</p></CardContent></Card>
        <Card className="border-amber-300/20 bg-[#0a1d37] shadow-lg shadow-black/10"><CardContent className="p-4"><p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-200"><ShieldCheck className="h-3.5 w-3.5" /> Approvals</p><p className="text-3xl font-black text-amber-100">{approvalSummary.pending}</p><p className="text-xs text-slate-400">{approvalSummary.approved} approved · {approvalSummary.needsWork} need edits</p></CardContent></Card>
      </div>

      <Card className="overflow-hidden border-white/10 bg-[#07182e] text-slate-100 shadow-lg shadow-black/20">
        <CardHeader className="border-b border-white/10 bg-gradient-to-r from-[#0b2344] via-[#092143] to-[#061426]">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D6B65A]" />
              TOC Approval Center
            </span>
            <Badge variant="outline" className="border-white/20 text-slate-200">
              {approvalSummary.pending} pending · {approvalSummary.total} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 bg-[#061426] p-4">
          {approvals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
              No approval requests yet. Use the approval box on any task for spend, artwork, contracts, final wording, or photo proof that needs sign-off.
            </div>
          ) : (
            approvals.slice(0, 12).map((approval) => (
              <div key={approval.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`gap-1 ${APPROVAL_CLASS[approval.status]}`}>
                        {approvalIcon(approval.status)}
                        {APPROVAL_LABEL[approval.status]}
                      </Badge>
                      {approval.category && <Badge variant="outline" className="border-white/15 text-slate-300">{approval.category}</Badge>}
                      {approval.task_title && <Badge variant="outline" className="border-[#D6B65A]/40 text-[#D6B65A]">{approval.task_title}</Badge>}
                      {approval.amount != null && <Badge className="bg-emerald-400/15 text-emerald-100">{money(approval.amount)}</Badge>}
                    </div>
                    <h3 className="mt-2 text-base font-bold text-white">{approval.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Requested by {approval.requested_by_email} · {formatDateTime(approval.created_at)}
                      {approval.needed_by ? ` · Needed by ${approval.needed_by}` : ""}
                      {approval.vendor ? ` · Vendor: ${approval.vendor}` : ""}
                    </p>
                    {approval.body && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{approval.body}</p>}
                    {(approval.attachments?.length > 0 || approval.links?.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(approval.attachments ?? []).map((file) => (
                          <a key={`${approval.id}-${file.url}`} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-400/10 px-2 py-1 text-xs text-blue-100 hover:bg-blue-400/20">
                            <Paperclip className="h-3 w-3" /> {file.name}
                          </a>
                        ))}
                        {(approval.links ?? []).map((link) => (
                          <a key={`${approval.id}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-400/10 px-2 py-1 text-xs text-blue-100 hover:bg-blue-400/20">
                            <LinkIcon className="h-3 w-3" /> {link.label || link.url}
                          </a>
                        ))}
                      </div>
                    )}
                    {approval.response_note && (
                      <div className="mt-3 rounded-lg border border-white/10 bg-[#07182e] p-2 text-sm text-slate-300">
                        <span className="font-semibold text-slate-100">Decision note:</span> {approval.response_note}
                        {approval.decided_by_email && <span className="block text-xs text-slate-500">By {approval.decided_by_email} · {approval.decided_at ? formatDateTime(approval.decided_at) : ""}</span>}
                      </div>
                    )}
                  </div>
                  <div className="w-full space-y-2 lg:w-80">
                    <Textarea
                      value={approvalDecisionNotes[approval.id] ?? ""}
                      onChange={(e) => setApprovalDecisionNotes((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                      placeholder="Optional decision note…"
                      className={`min-h-16 ${DARK_FIELD_CLASS}`}
                      disabled={!!approvalsUnavailable || savingId === `approval-decision-${approval.id}`}
                    />
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      <Button size="sm" onClick={() => void decideApproval(approval, "approved")} disabled={!!approvalsUnavailable || savingId === `approval-decision-${approval.id}`} className="bg-emerald-500 text-white hover:bg-emerald-600">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void decideApproval(approval, "changes_requested")} disabled={!!approvalsUnavailable || savingId === `approval-decision-${approval.id}`} className="border-blue-300/30 bg-blue-400/10 text-blue-100 hover:bg-blue-400/20 hover:text-white">
                        Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void decideApproval(approval, "rejected")} disabled={!!approvalsUnavailable || savingId === `approval-decision-${approval.id}`} className="border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:text-white">
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-[#07182e] text-slate-100 shadow-lg shadow-black/20">
        <CardHeader className="border-b border-white/10 bg-gradient-to-r from-[#0b2344] via-[#092143] to-[#061426]">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#D6B65A]" />
              TOC Document Share
            </span>
            <Badge variant="outline" className="border-white/20 text-slate-200">{documents.length} files · {money(documentTotal)} logged</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 bg-[#061426] p-4 lg:grid-cols-[380px_1fr]">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Upload receipt, contract, proof, photo, or file</div>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-300">Title</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Venue deposit receipt" disabled={!!documentsUnavailable} className={DARK_FIELD_CLASS} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-300">Category</Label>
                  <Select value={docCategory} onValueChange={setDocCategory} disabled={!!documentsUnavailable}>
                    <SelectTrigger className={DARK_FIELD_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Receipts", "Contracts", "Invoices", "Artwork", "Venue", "Sponsors", "Photos", "Other"].map((value) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Vendor</Label>
                  <Input value={docVendor} onChange={(e) => setDocVendor(e.target.value)} placeholder="Vendor or payee" disabled={!!documentsUnavailable} className={DARK_FIELD_CLASS} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-300">Amount $</Label>
                  <Input
                    inputMode="decimal"
                    value={docAmount}
                    onChange={(e) => setDocAmount(normalizeCurrencyInput(e.target.value))}
                    onBlur={(e) => setDocAmount(normalizeCurrencyInput(e.target.value))}
                    placeholder="$0.00"
                    disabled={!!documentsUnavailable}
                    className={DARK_FIELD_CLASS}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Uploaded by</Label>
                  <Input value={currentUser?.email ?? "Signed-in TOC user"} disabled className="border-slate-500/30 bg-slate-950/20 text-slate-300" />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Notes</Label>
                <Textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} placeholder="What this is, vendor, payment method, next step…" disabled={!!documentsUnavailable} className={DARK_FIELD_CLASS} />
              </div>
              <div>
                <Label className="text-slate-300">File</Label>
                <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} disabled={!!documentsUnavailable} className={`${DARK_FIELD_CLASS} file:text-slate-100`} />
              </div>
              <Button onClick={() => void uploadSharedDocument()} disabled={!!documentsUnavailable || uploadingDocument || !docFile} className="w-full bg-[#D6B65A] text-[#061426] hover:bg-[#c8a94f]">
                <Upload className="mr-2 h-4 w-4" /> {uploadingDocument ? "Uploading…" : "Upload to doc share"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
                No shared TOC documents yet. Upload receipts, contracts, quotes, sponsor files, artwork, floorplans, or photos here.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-[#D6B65A] hover:underline">
                        {doc.title}
                      </a>
                      {doc.category && <Badge variant="secondary">{doc.category}</Badge>}
                      {doc.vendor && <Badge variant="outline" className="border-[#D6B65A]/40 text-[#D6B65A]">{doc.vendor}</Badge>}
                      {doc.amount != null && <Badge className="bg-green-100 text-green-800">{money(doc.amount)}</Badge>}
                      {doc.ai_review_status === "reviewed" && <Badge className="bg-blue-400/15 text-blue-100">AI reviewed</Badge>}
                      {doc.ai_review_status === "skipped" && <Badge variant="outline" className="border-amber-300/30 text-amber-100">AI skipped</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {doc.file_name} · {formatFileSize(doc.file_size)}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Uploaded by {doc.uploaded_by || "unknown"} · {formatDateTime(doc.created_at)} · Updated {formatDateTime(doc.updated_at || doc.created_at)}
                    </div>
                    {(doc.document_date || doc.ai_summary || doc.ai_metadata) && (
                      <div className="mt-3 rounded-lg border border-blue-300/20 bg-blue-400/10 p-3 text-sm text-slate-200">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-100">AI document review</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                          {doc.document_date && <span>Date: {doc.document_date}</span>}
                          {aiMetaText(doc, "documentType") && <span>Type: {aiMetaText(doc, "documentType")}</span>}
                          {aiMetaText(doc, "paymentStatus") && <span>Payment: {aiMetaText(doc, "paymentStatus")}</span>}
                          {aiMetaText(doc, "orderNumber") && <span>Order #: {aiMetaText(doc, "orderNumber")}</span>}
                          {aiMetaText(doc, "dueDate") && <span>Due: {aiMetaText(doc, "dueDate")}</span>}
                          {aiMetaText(doc, "confidence") && <span>Confidence: {aiMetaText(doc, "confidence")}</span>}
                        </div>
                        {doc.ai_summary && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{doc.ai_summary}</p>}
                        {aiMetaText(doc, "keyDates") && <p className="mt-2 text-xs text-slate-300">Key dates: {aiMetaText(doc, "keyDates")}</p>}
                      </div>
                    )}
                    {doc.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{doc.description}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void deleteSharedDocument(doc.id)}
                    disabled={savingId === `document-${doc.id}`}
                    className="text-red-200 hover:bg-red-500/10 hover:text-red-100"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-[#07182e] shadow-lg shadow-black/20">
        <CardHeader className="border-b border-white/10 bg-gradient-to-r from-[#002147] to-[#0b3a6d] text-white">
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>TOC Master Board</span>
            <span className="flex flex-wrap items-center gap-2 text-sm font-normal text-white/80">
              <span>{filteredTasks.length} of {tasks.length} tasks shown</span>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${taskFilter === "all" ? "bg-white text-[#002147]" : "text-white/75 hover:text-white"}`}
                >
                  All tasks
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("mine")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${taskFilter === "mine" ? "bg-white text-[#002147]" : "text-white/75 hover:text-white"}`}
                >
                  My tasks
                </button>
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 bg-[#061426] p-3 sm:p-4">
        <div className="rounded-2xl border border-white/10 bg-[#07182e] p-3 shadow-lg shadow-black/10 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">Task filters</div>
              <div className="text-xs text-slate-400">Filter by owner, workstream, status, priority, or keyword.</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetTaskFilters}
              disabled={activeFilterCount === 0}
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Clear filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div>
              <Label className="text-xs text-slate-400">Search</Label>
              <Input
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search task, notes, owner…"
                className={`mt-1 ${DARK_FIELD_CLASS}`}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Owner</Label>
              <Select value={taskOwnerFilter} onValueChange={setTaskOwnerFilter}>
                <SelectTrigger className={`mt-1 ${DARK_FIELD_CLASS}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {ownerOptions.map((owner) => (
                    <SelectItem key={owner.value} value={owner.value}>{owner.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Category</Label>
              <Select value={taskCategoryFilter} onValueChange={setTaskCategoryFilter}>
                <SelectTrigger className={`mt-1 ${DARK_FIELD_CLASS}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {TOC_PROJECT_CATEGORIES.map((category) => (
                    <SelectItem key={category.name} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Status</Label>
              <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                <SelectTrigger className={`mt-1 ${DARK_FIELD_CLASS}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Priority</Label>
              <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                <SelectTrigger className={`mt-1 ${DARK_FIELD_CLASS}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {["low", "normal", "high", "urgent"].map((priority) => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {tasks.length === 0 && !unavailable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">No TOC tasks are saved in this environment yet.</p>
                <p className="mt-1">Use the master list you gave me to populate the board.</p>
              </div>
              <Button onClick={() => void seedMasterTasks()} disabled={seedingTasks}>
                <Plus className="mr-2 h-4 w-4" /> {seedingTasks ? "Seeding…" : "Seed master task list"}
              </Button>
            </div>
          </div>
        )}
        {tasks.length > 0 && filteredTasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-slate-400">
            No tasks match the current filters.
          </div>
        )}
        {TOC_PROJECT_CATEGORIES.filter((category) => taskCategoryFilter === "all" || category.name === taskCategoryFilter).map((category) => {
          const meta = categoryMeta(category.name)
          const categoryTasks = filteredTasks.filter((task) => task.category === category.name).sort((a, b) => a.sort_order - b.sort_order)
          const categoryBudget = categoryTasks.reduce((sum, task) => sum + Number(task.budget_amount ?? 0), 0)
          if (categoryTasks.length === 0 && taskCategoryFilter === "all" && activeFilterCount > 0) return null
          return (
            <section key={category.name} className="overflow-hidden rounded-xl border border-white/10 bg-[#07182e] shadow-lg shadow-black/10">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#0a1d37] via-[#07182e] to-[#061426] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-8 w-1.5 rounded-full ${meta.accent}`} />
                  <div>
                    <h3 className="text-lg font-bold text-white">{category.name}</h3>
                    <p className="text-xs text-slate-400">{categoryTasks.length} tasks · {money(categoryBudget)} budget</p>
                  </div>
                </div>
              <div className="flex w-full min-w-0 flex-1 gap-2 sm:min-w-72 sm:flex-initial">
                  <Input
                    value={newTaskTitle[category.name] ?? ""}
                    onChange={(e) => setNewTaskTitle((prev) => ({ ...prev, [category.name]: e.target.value }))}
                    placeholder={`+ Add ${category.name} task`}
                    disabled={!!unavailable}
                    className={DARK_FIELD_SMALL_CLASS}
                  />
                  <Button size="sm" onClick={() => void addTask(category.name)} disabled={!!unavailable || savingId === `new-${category.name}`} className="bg-[#D6B65A] text-[#061426] hover:bg-[#c8a94f]">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-visible md:overflow-x-auto">
                <div className="md:min-w-[1320px]">
                  <div className="hidden grid-cols-[minmax(280px,1.7fr)_210px_150px_140px_140px_120px_120px_120px_120px] border-b border-white/10 bg-[#0a1d37] text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
                    <div className="border-r border-white/10 px-3 py-2">Item</div>
                    <div className="border-r border-white/10 px-3 py-2">Owner</div>
                    <div className="border-r border-white/10 px-3 py-2">Status</div>
                    <div className="border-r border-white/10 px-3 py-2">Due</div>
                    <div className="border-r border-white/10 px-3 py-2">Delivery</div>
                    <div className="border-r border-white/10 px-3 py-2">Priority</div>
                    <div className="border-r border-white/10 px-3 py-2">Budget</div>
                    <div className="border-r border-white/10 px-3 py-2">Actual</div>
                    <div className="px-3 py-2">Updates</div>
                  </div>

                  {categoryTasks.length === 0 && activeFilterCount > 0 && (
                    <div className="border-b border-white/10 bg-[#07182e] px-4 py-6 text-center text-sm text-slate-400">
                      No tasks in this workstream match the current filters.
                    </div>
                  )}

                  {categoryTasks.map((task) => {
                    const draft = drafts[task.id] ?? task
                    const disabled = !!unavailable || task.id.startsWith("seed-")
                    const taskApprovals = approvals.filter((approval) => approval.task_id === task.id)
                    const pendingTaskApprovals = taskApprovals.filter((approval) => approval.status === "pending").length
                    const approvalDraft = approvalDraftFor(task)
                    return (
                      <div key={task.id} className="border-b border-white/10 last:border-b-0">
                        <div className="grid grid-cols-1 items-stretch bg-[#07182e] text-sm text-slate-100 transition-colors hover:bg-[#0a1d37] md:grid-cols-[minmax(280px,1.7fr)_210px_150px_140px_140px_120px_120px_120px_120px] md:items-center">
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Item</div>
                            <Input
                              value={draft.title}
                              onChange={(e) => updateDraft(task.id, { title: e.target.value })}
                              className="h-9 border-transparent bg-transparent font-semibold text-white shadow-none hover:border-white/10 focus:border-white/20"
                              disabled={disabled}
                            />
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Owner</div>
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {(draft.assignees ?? []).slice(0, 3).map((assignee) => {
                                const label = assigneeDisplayName(assignee)
                                return (
                                  <span key={`${task.id}-${label}`} title={assigneeTooltip(assignee)} className="inline-flex items-center gap-1 rounded-full border border-[#D6B65A]/30 bg-[#D6B65A]/10 py-1 pl-1 pr-2 text-xs font-semibold text-[#D6B65A]">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#D6B65A] text-[10px] font-black text-[#061426]">
                                      {ownerInitials(label)}
                                    </span>
                                    <span className="max-w-[110px] truncate">{label}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeOwner(draft, assignee)}
                                      disabled={disabled}
                                      className="ml-0.5 rounded-full px-1 text-[#D6B65A]/70 hover:bg-white/10 hover:text-white disabled:opacity-40"
                                      aria-label={`Remove ${label}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                )
                              })}
                              {(draft.assignees ?? []).length === 0 && <span className="text-xs text-slate-500">No owner</span>}
                            </div>
                            <div className="mt-1 space-y-1">
                              <Input
                                placeholder="Search by email, first name, or last name"
                                value={ownerSearch[task.id] ?? ""}
                                onChange={(e) => void searchOwner(task.id, e.target.value)}
                                disabled={disabled}
                                className="h-8 border-blue-200/40 bg-blue-400/15 text-xs text-white placeholder:text-blue-100/70 focus-visible:border-[#D6B65A] focus-visible:ring-[#D6B65A]/35"
                              />
                              {(ownerSuggestions[task.id] ?? []).length > 0 && (
                                <div className="max-h-28 overflow-y-auto rounded-md border border-white/10 bg-[#061426] shadow-lg">
                                  {(ownerSuggestions[task.id] ?? []).map((user) => (
                                    <button
                                      key={user.userId}
                                      type="button"
                                      onClick={() => addOwnerFromUser(draft, user)}
                                      className="block w-full px-2 py-1.5 text-left text-xs hover:bg-white/10"
                                    >
                                      <span className="font-semibold text-white">{user.name}</span>
                                      <span className="block text-slate-400">{user.email}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {ownerSearchLoading[task.id] && <div className="text-[11px] text-slate-400">Searching RecruitNC…</div>}
                            </div>
                            <Button type="button" size="sm" variant="ghost" onClick={() => selfAssign(draft)} disabled={disabled || !currentUser} className="mt-1 h-7 px-1 text-xs text-[#D6B65A] hover:bg-white/10 hover:text-white">
                              <UserPlus className="mr-1 h-3 w-3" /> Self assign
                            </Button>
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Status</div>
                            <Select value={draft.status} onValueChange={(value) => updateDraft(task.id, { status: value as TocProjectTask["status"] })} disabled={disabled}>
                              <SelectTrigger className={`h-9 border-0 font-semibold shadow-none ${STATUS_CLASS[draft.status]}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Due date</div>
                            <Input type="date" value={draft.due_date ?? ""} onChange={(e) => updateDraft(task.id, { due_date: e.target.value || null })} disabled={disabled} className={`${DARK_FIELD_SMALL_CLASS} text-xs [color-scheme:dark]`} />
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Delivery date</div>
                            <Input type="date" value={draft.delivery_date ?? ""} onChange={(e) => updateDraft(task.id, { delivery_date: e.target.value || null })} disabled={disabled} className={`${DARK_FIELD_SMALL_CLASS} text-xs [color-scheme:dark]`} />
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Priority</div>
                            <Select value={draft.priority} onValueChange={(value) => updateDraft(task.id, { priority: value as TocProjectTask["priority"] })} disabled={disabled}>
                              <SelectTrigger className={`${DARK_SELECT_CLASS} text-xs capitalize`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Budget</div>
                            <Input
                              inputMode="decimal"
                              value={formatCurrencyInput(draft.budget_amount)}
                              onChange={(e) => updateDraft(task.id, { budget_amount: parseCurrencyInput(e.target.value) })}
                              onBlur={(e) => updateDraft(task.id, { budget_amount: parseCurrencyInput(e.target.value) })}
                              placeholder="$0.00"
                              disabled={disabled}
                              className={DARK_FIELD_SMALL_CLASS}
                            />
                          </div>
                          <div className="border-b border-white/10 p-3 md:border-b-0 md:border-r md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Actual</div>
                            <Input
                              inputMode="decimal"
                              value={formatCurrencyInput(draft.actual_amount)}
                              onChange={(e) => updateDraft(task.id, { actual_amount: parseCurrencyInput(e.target.value) })}
                              onBlur={(e) => updateDraft(task.id, { actual_amount: parseCurrencyInput(e.target.value) })}
                              placeholder="$0.00"
                              disabled={disabled}
                              className={DARK_FIELD_SMALL_CLASS}
                            />
                          </div>
                          <div className="p-3 md:p-2">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">Updates</div>
                            <div className="flex flex-wrap gap-1">
                              <Badge className="gap-1 border border-blue-300/30 bg-blue-400/15 text-blue-100 hover:bg-blue-400/20"><MessageSquare className="h-3 w-3" />{draft.comments?.length ?? 0}</Badge>
                              <Badge className="gap-1 border border-slate-300/25 bg-slate-400/15 text-slate-100 hover:bg-slate-400/20"><Paperclip className="h-3 w-3" />{draft.attachments?.length ?? 0}</Badge>
                              <Badge className="gap-1 border border-indigo-300/30 bg-indigo-400/15 text-indigo-100 hover:bg-indigo-400/20"><LinkIcon className="h-3 w-3" />{draft.links?.length ?? 0}</Badge>
                              <Badge className={`gap-1 border ${pendingTaskApprovals ? "border-amber-300/40 bg-amber-400/20 text-amber-100" : "border-slate-300/25 bg-slate-400/15 text-slate-100"} hover:bg-white/15`}><ShieldCheck className="h-3 w-3" />{pendingTaskApprovals}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 bg-[#061426] p-3 lg:grid-cols-[1fr_1fr]">
                          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Notes & links</div>
                            <Textarea value={draft.notes ?? ""} onChange={(e) => updateDraft(task.id, { notes: e.target.value })} placeholder="Notes, decisions, next steps…" disabled={disabled} className={`min-h-20 ${DARK_FIELD_CLASS}`} />
                            <div className="mt-2">
                              <Label className="text-xs text-slate-400">Links — one per line: Label|https://...</Label>
                              <Textarea value={linksText(draft.links ?? [])} onChange={(e) => updateDraft(task.id, { links: parseLinks(e.target.value) })} placeholder="Venue quote|https://..." disabled={disabled} className={`mt-1 min-h-16 ${DARK_FIELD_CLASS}`} />
                              {draft.links?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {draft.links.map((link) => (
                                    <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-400/10 px-2 py-1 text-xs text-blue-100 hover:bg-blue-400/20">
                                      <LinkIcon className="h-3 w-3" /> {link.label || link.url}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                <Paperclip className="h-3.5 w-3.5" /> Files
                              </div>
                              <Input type="file" disabled={disabled} onChange={(e) => void uploadAttachment(task.id, e.target.files?.[0] ?? null)} className={`${DARK_FIELD_CLASS} file:text-slate-100`} />
                              {draft.attachments?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {draft.attachments.map((file) => (
                                    <a key={`${file.url}-${file.name}`} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-200 hover:underline">
                                      <Upload className="h-3 w-3" /> {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                <MessageSquare className="h-3.5 w-3.5" /> Updates
                              </div>
                              {draft.comments?.length > 0 && (
                                <div className="mb-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                                  {[...(draft.comments ?? [])].reverse().map((comment) => (
                                    <div key={comment.id} className="rounded-lg border border-white/10 bg-[#07182e] p-2 text-sm">
                                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                                        <span className="font-medium text-slate-200">{comment.createdBy?.name || comment.createdBy?.email || "Unknown user"}</span>
                                        <span>{formatDateTime(comment.createdAt)}</span>
                                      </div>
                                      <p className="whitespace-pre-wrap text-slate-300">{comment.body}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Textarea
                                  value={commentDrafts[task.id] ?? ""}
                                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                  placeholder="Add an update…"
                                  className={`min-h-14 ${DARK_FIELD_CLASS}`}
                                  disabled={disabled}
                                />
                                <Button
                                  type="button"
                                  onClick={() => void addComment(task.id)}
                                  disabled={disabled || savingId === task.id || !(commentDrafts[task.id] || "").trim()}
                                  className="sm:self-end"
                                >
                                  Update
                                </Button>
                              </div>
                            </div>

                            <div className="rounded-lg border border-amber-300/20 bg-amber-400/5 p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-100">
                                  <ShieldCheck className="h-3.5 w-3.5" /> Approval requests
                                </div>
                                {pendingTaskApprovals > 0 && <Badge className="bg-amber-400/20 text-amber-100">{pendingTaskApprovals} pending</Badge>}
                              </div>
                              {taskApprovals.length > 0 && (
                                <div className="mb-3 space-y-2">
                                  {taskApprovals.slice(0, 3).map((approval) => (
                                    <div key={approval.id} className="rounded-lg border border-white/10 bg-[#07182e] p-2 text-xs">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge className={`gap-1 ${APPROVAL_CLASS[approval.status]}`}>
                                          {approvalIcon(approval.status)}
                                          {APPROVAL_LABEL[approval.status]}
                                        </Badge>
                                        {approval.amount != null && <span className="text-emerald-100">{money(approval.amount)}</span>}
                                      </div>
                                      <div className="mt-1 font-semibold text-white">{approval.title}</div>
                                      <div className="text-slate-400">By {approval.requested_by_email} · {formatDateTime(approval.created_at)}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="space-y-2">
                                <Input
                                  value={approvalDraft.title}
                                  onChange={(e) => updateApprovalDraft(task, { title: e.target.value })}
                                  placeholder="What needs approval?"
                                  disabled={disabled || !!approvalsUnavailable}
                                  className={DARK_FIELD_SMALL_CLASS}
                                />
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <Input
                                    value={approvalDraft.vendor}
                                    onChange={(e) => updateApprovalDraft(task, { vendor: e.target.value })}
                                    placeholder="Vendor"
                                    disabled={disabled || !!approvalsUnavailable}
                                    className={DARK_FIELD_SMALL_CLASS}
                                  />
                                  <Input
                                    inputMode="decimal"
                                    value={approvalDraft.amount}
                                    onChange={(e) => updateApprovalDraft(task, { amount: normalizeCurrencyInput(e.target.value) })}
                                    onBlur={(e) => updateApprovalDraft(task, { amount: normalizeCurrencyInput(e.target.value) })}
                                    placeholder="$0.00"
                                    disabled={disabled || !!approvalsUnavailable}
                                    className={DARK_FIELD_SMALL_CLASS}
                                  />
                                  <Input
                                    type="date"
                                    value={approvalDraft.neededBy}
                                    onChange={(e) => updateApprovalDraft(task, { neededBy: e.target.value })}
                                    disabled={disabled || !!approvalsUnavailable}
                                    className={`${DARK_FIELD_SMALL_CLASS} text-xs [color-scheme:dark]`}
                                  />
                                </div>
                                <Textarea
                                  value={approvalDraft.body}
                                  onChange={(e) => updateApprovalDraft(task, { body: e.target.value })}
                                  placeholder="Context, decision needed, options, or what changed…"
                                  disabled={disabled || !!approvalsUnavailable}
                                  className={`min-h-14 ${DARK_FIELD_CLASS}`}
                                />
                                <Textarea
                                  value={approvalDraft.links}
                                  onChange={(e) => updateApprovalDraft(task, { links: e.target.value })}
                                  placeholder="Optional links — one per line: Label|https://..."
                                  disabled={disabled || !!approvalsUnavailable}
                                  className={`min-h-12 ${DARK_FIELD_CLASS}`}
                                />
                                <Input
                                  type="file"
                                  disabled={disabled || !!approvalsUnavailable}
                                  onChange={(e) => updateApprovalDraft(task, { file: e.target.files?.[0] ?? null })}
                                  className={`${DARK_FIELD_CLASS} file:text-slate-100`}
                                />
                                <Button
                                  type="button"
                                  onClick={() => void requestApproval(task)}
                                  disabled={disabled || !!approvalsUnavailable || savingId === `approval-${task.id}` || !approvalDraft.title.trim()}
                                  className="w-full bg-[#D6B65A] text-[#061426] hover:bg-[#c8a94f]"
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" /> {savingId === `approval-${task.id}` ? "Requesting…" : "Request approval"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-end gap-2 bg-[#061426] px-3 pb-3 sm:flex-row">
                          <Button variant="outline" size="sm" onClick={() => void deleteTask(task.id)} disabled={disabled || savingId === task.id} className="w-full border-white/10 bg-white/5 text-slate-200 hover:bg-red-500/10 hover:text-red-100 sm:w-auto">
                            <Trash2 className="mr-1 h-4 w-4" /> Delete
                          </Button>
                          <Button size="sm" onClick={() => void saveTask(task.id)} disabled={disabled || savingId === task.id} className="w-full bg-[#D6B65A] text-[#061426] hover:bg-[#c8a94f] sm:w-auto">
                            <Save className="mr-1 h-4 w-4" /> {savingId === task.id ? "Saving…" : "Save row"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-white/10 bg-[#07182e] p-4 text-sm text-slate-300">
        <div className="mb-1 flex items-center gap-2 font-semibold text-white">
          <DollarSign className="h-4 w-4" /> Suggested operating rhythm
        </div>
        Use status for weekly ops calls, assignees for ownership, budget/actual for vendor spend, links for quotes/forms, and attachments for contracts, artwork, floorplans, invoices, or venue photos.
      </div>
    </div>
  )
}
