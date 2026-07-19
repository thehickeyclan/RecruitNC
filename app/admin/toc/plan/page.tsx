"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, DollarSign, FileText, LinkIcon, MessageSquare, Paperclip, Plus, Save, Trash2, Upload, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TOC_EVENT_DATE, TOC_EVENT_DATES_RANGE } from "@/lib/toc/constants"
import { TOC_PROJECT_CATEGORIES, type TocProjectDocument, type TocProjectTask, type TocTaskAssignee, type TocTaskLink } from "@/lib/toc/project-plan"

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

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
}

const STATUS_CLASS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  blocked: "bg-red-100 text-red-800",
  done: "bg-green-100 text-green-800",
}

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "$0"
  return Number(value).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function parseAssignees(value: string): TocTaskAssignee[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const emailMatch = part.match(/<?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?/)
      const email = emailMatch?.[1] ?? null
      const name = email ? part.replace(emailMatch?.[0] ?? "", "").replace(/[<>]/g, "").trim() || email : part
      return { name, email }
    })
}

function assigneesText(rows: TocTaskAssignee[]): string {
  return rows.map((a) => (a.email && a.name !== a.email ? `${a.name} <${a.email}>` : a.name || a.email || "")).filter(Boolean).join(", ")
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
  const [currentUser, setCurrentUser] = useState<{ userId: string; email: string } | null>(null)
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [documentsUnavailable, setDocumentsUnavailable] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, TocProjectTask>>({})
  const [docTitle, setDocTitle] = useState("")
  const [docCategory, setDocCategory] = useState("Receipts")
  const [docAmount, setDocAmount] = useState("")
  const [docDescription, setDocDescription] = useState("")
  const [docFile, setDocFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [tasksRes, documentsRes] = await Promise.all([
        fetch("/api/admin/toc/project-tasks", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/toc/project-documents", { cache: "no-store", credentials: "include" }),
      ])
      const data = (await tasksRes.json()) as Payload
      const documentsData = (await documentsRes.json()) as DocumentsPayload
      if (!tasksRes.ok) throw new Error(data.error || "Could not load TOC project plan")
      if (!documentsRes.ok) throw new Error(documentsData.error || "Could not load TOC documents")
      setTasks(data.tasks ?? [])
      setDocuments(documentsData.documents ?? [])
      setCurrentUser(data.currentUser ?? null)
      setUnavailable(data.unavailable ? `Database table missing. Run ${data.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable shared editing.` : null)
      setDocumentsUnavailable(documentsData.unavailable ? `Document share missing. Run ${documentsData.setupSql ?? "docs/sql/toc-project-plan.sql"} in Supabase to enable uploads.` : null)
      setDrafts(Object.fromEntries((data.tasks ?? []).map((task) => [task.id, task])))
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

  function updateDraft(id: string, patch: Partial<TocProjectTask>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? tasks.find((t) => t.id === id)!), ...patch } }))
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
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
      setDocAmount("")
      setDocDescription("")
      setDocFile(null)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setSavingId(null)
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
    updateDraft(task.id, { assignees: [...existing, { name: currentUser.email, email: currentUser.email, userId: currentUser.userId }] })
  }

  if (loading) return <div className="p-8 text-gray-500">Loading TOC project plan…</div>

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/admin/toc" className="mb-2 inline-flex items-center gap-2 text-sm text-[#B31B1B] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            TOC dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Tournament of Champions Project Plan</h1>
          <p className="mt-1 text-gray-600">Shared task board for operations, competition, marketing, sponsors, fan experience, and special events.</p>
        </div>
        <Button onClick={() => void load()} variant="outline">Refresh</Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {unavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{unavailable}</div>}
      {documentsUnavailable && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{documentsUnavailable}</div>}

      <Card className="overflow-hidden border-[#002147]/20 bg-gradient-to-r from-[#002147] to-[#0b3a6d] text-white">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D6B65A]">
              <CalendarDays className="h-3.5 w-3.5" /> Tournament countdown
            </div>
            <h2 className="text-2xl font-bold">Tournament of Champions · {TOC_EVENT_DATES_RANGE}</h2>
            <p className="mt-1 text-sm text-white/75">Keep the team focused on contracts, field, sponsors, venue, and fan experience before event weekend.</p>
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

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Tasks</p><p className="text-2xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Complete</p><p className="text-2xl font-bold text-green-700">{summary.done}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Progress</p><p className="text-2xl font-bold text-blue-700">{summary.pct}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Blocked</p><p className="text-2xl font-bold text-red-700">{summary.blocked}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Budget / Actual</p><p className="text-xl font-bold">{money(summary.budget)} / {money(summary.actual)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#002147]" />
              TOC Document Share
            </span>
            <Badge variant="outline">{documents.length} files · {money(documentTotal)} logged</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="mb-3 text-sm font-semibold text-gray-900">Upload receipt, contract, proof, photo, or file</div>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Venue deposit receipt" disabled={!!documentsUnavailable} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Select value={docCategory} onValueChange={setDocCategory} disabled={!!documentsUnavailable}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Receipts", "Contracts", "Invoices", "Artwork", "Venue", "Sponsors", "Photos", "Other"].map((value) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount $</Label>
                  <Input type="number" value={docAmount} onChange={(e) => setDocAmount(e.target.value)} placeholder="Optional" disabled={!!documentsUnavailable} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} placeholder="What this is, vendor, payment method, next step…" disabled={!!documentsUnavailable} />
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} disabled={!!documentsUnavailable} />
              </div>
              <Button onClick={() => void uploadSharedDocument()} disabled={!!documentsUnavailable || uploadingDocument || !docFile} className="w-full">
                <Upload className="mr-2 h-4 w-4" /> {uploadingDocument ? "Uploading…" : "Upload to doc share"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                No shared TOC documents yet. Upload receipts, contracts, quotes, sponsor files, artwork, floorplans, or photos here.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-[#002147] hover:underline">
                        {doc.title}
                      </a>
                      {doc.category && <Badge variant="secondary">{doc.category}</Badge>}
                      {doc.amount != null && <Badge className="bg-green-100 text-green-800">{money(doc.amount)}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {doc.file_name} · {formatFileSize(doc.file_size)} · uploaded by {doc.uploaded_by || "unknown"} · {formatDateTime(doc.created_at)}
                    </div>
                    {doc.description && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{doc.description}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void deleteSharedDocument(doc.id)}
                    disabled={savingId === `document-${doc.id}`}
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {TOC_PROJECT_CATEGORIES.map((category) => {
          const meta = categoryMeta(category.name)
          const categoryTasks = tasks.filter((task) => task.category === category.name).sort((a, b) => a.sort_order - b.sort_order)
          const categoryBudget = categoryTasks.reduce((sum, task) => sum + Number(task.budget_amount ?? 0), 0)
          return (
            <Card key={category.name} className={`border-2 ${meta.color}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${meta.accent}`} />
                    {category.name}
                  </span>
                  <Badge variant="outline">{categoryTasks.length} · {money(categoryBudget)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 rounded-lg border bg-white/70 p-2">
                  <Input
                    value={newTaskTitle[category.name] ?? ""}
                    onChange={(e) => setNewTaskTitle((prev) => ({ ...prev, [category.name]: e.target.value }))}
                    placeholder={`Add ${category.name} task…`}
                    disabled={!!unavailable}
                  />
                  <Button onClick={() => void addTask(category.name)} disabled={!!unavailable || savingId === `new-${category.name}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {categoryTasks.map((task) => {
                  const draft = drafts[task.id] ?? task
                  const disabled = !!unavailable || task.id.startsWith("seed-")
                  return (
                    <div key={task.id} className="rounded-xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <Input
                          value={draft.title}
                          onChange={(e) => updateDraft(task.id, { title: e.target.value })}
                          className="font-semibold"
                          disabled={disabled}
                        />
                        <div className="flex gap-2">
                          <Select value={draft.status} onValueChange={(value) => updateDraft(task.id, { status: value as TocProjectTask["status"] })} disabled={disabled}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Badge className={STATUS_CLASS[draft.status]}>{STATUS_LABEL[draft.status]}</Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <Label>Budget $</Label>
                          <Input type="number" value={draft.budget_amount ?? ""} onChange={(e) => updateDraft(task.id, { budget_amount: e.target.value === "" ? null : Number(e.target.value) })} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Actual $</Label>
                          <Input type="number" value={draft.actual_amount ?? ""} onChange={(e) => updateDraft(task.id, { actual_amount: e.target.value === "" ? null : Number(e.target.value) })} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Due date</Label>
                          <Input type="date" value={draft.due_date ?? ""} onChange={(e) => updateDraft(task.id, { due_date: e.target.value || null })} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select value={draft.priority} onValueChange={(value) => updateDraft(task.id, { priority: value as TocProjectTask["priority"] })} disabled={disabled}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between">
                          <Label>Assignees</Label>
                          <Button type="button" size="sm" variant="ghost" onClick={() => selfAssign(draft)} disabled={disabled || !currentUser}>
                            <UserPlus className="mr-1 h-3 w-3" /> Self assign
                          </Button>
                        </div>
                        <Input
                          placeholder="Name, Name <email>, email@domain.com"
                          value={assigneesText(draft.assignees ?? [])}
                          onChange={(e) => updateDraft(task.id, { assignees: parseAssignees(e.target.value) })}
                          disabled={disabled}
                        />
                      </div>

                      <div className="mt-3">
                        <Label>Notes</Label>
                        <Textarea value={draft.notes ?? ""} onChange={(e) => updateDraft(task.id, { notes: e.target.value })} placeholder="Notes, decisions, next steps…" disabled={disabled} />
                      </div>

                      <div className="mt-3">
                        <Label>Links <span className="text-xs text-gray-400">(one per line: Label|https://...)</span></Label>
                        <Textarea value={linksText(draft.links ?? [])} onChange={(e) => updateDraft(task.id, { links: parseLinks(e.target.value) })} placeholder="Venue quote|https://..." disabled={disabled} />
                        {draft.links?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {draft.links.map((link) => (
                              <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200">
                                <LinkIcon className="h-3 w-3" /> {link.label || link.url}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Paperclip className="h-4 w-4" /> Attachments
                        </div>
                        <Input type="file" disabled={disabled} onChange={(e) => void uploadAttachment(task.id, e.target.files?.[0] ?? null)} />
                        {draft.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {draft.attachments.map((file) => (
                              <a key={`${file.url}-${file.name}`} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-700 hover:underline">
                                <Upload className="h-3 w-3" /> {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <MessageSquare className="h-4 w-4" /> Comments
                          {draft.comments?.length > 0 && <Badge variant="outline">{draft.comments.length}</Badge>}
                        </div>
                        {draft.comments?.length > 0 && (
                          <div className="mb-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                            {[...(draft.comments ?? [])].reverse().map((comment) => (
                              <div key={comment.id} className="rounded-lg border bg-white p-2 text-sm">
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                                  <span className="font-medium text-gray-700">{comment.createdBy?.name || comment.createdBy?.email || "Unknown user"}</span>
                                  <span>{formatDateTime(comment.createdAt)}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-gray-700">{comment.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Textarea
                            value={commentDrafts[task.id] ?? ""}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="Add a quick update, decision, blocker, or follow-up…"
                            className="min-h-16"
                            disabled={disabled}
                          />
                          <Button
                            type="button"
                            onClick={() => void addComment(task.id)}
                            disabled={disabled || savingId === task.id || !(commentDrafts[task.id] || "").trim()}
                            className="sm:self-end"
                          >
                            Comment
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => void deleteTask(task.id)} disabled={disabled || savingId === task.id}>
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                        <Button size="sm" onClick={() => void saveTask(task.id)} disabled={disabled || savingId === task.id}>
                          <Save className="mr-1 h-4 w-4" /> {savingId === task.id ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
        <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
          <DollarSign className="h-4 w-4" /> Suggested operating rhythm
        </div>
        Use status for weekly ops calls, assignees for ownership, budget/actual for vendor spend, links for quotes/forms, and attachments for contracts, artwork, floorplans, invoices, or venue photos.
      </div>
    </div>
  )
}
