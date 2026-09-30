"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPhoneForDisplay } from "@/lib/phone-format"
import { RefreshCw, Loader2, Users, ArrowLeft, FileSpreadsheet, Mail, Check } from "lucide-react"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"

const BLANK_VALUE = "__none__"

const STATUS_OPTIONS = [
  { value: BLANK_VALUE, label: "—" },
  { value: "text_sent", label: "Text sent" },
  { value: "invite_sent", label: "Invite sent" },
  { value: "registered", label: "Registered" },
  { value: "declined", label: "Declined" },
] as const

const REGIONAL_OPTIONS = [
  { value: BLANK_VALUE, label: "—" },
  { value: "1A", label: "1A" },
  { value: "2A", label: "2A" },
  { value: "3A", label: "3A" },
  { value: "4A", label: "4A" },
  { value: "5A", label: "5A" },
  { value: "6A", label: "6A" },
  { value: "7A", label: "7A" },
  { value: "8A", label: "8A" },
] as const

const PLACEMENT_OPTIONS = [
  { value: BLANK_VALUE, label: "—" },
  { value: "1st", label: "1st" },
  { value: "2nd", label: "2nd" },
  { value: "3rd", label: "3rd" },
  { value: "4th", label: "4th" },
] as const

const ACHIEVEMENT_LABELS: Record<string, string> = {
  all_american: "All American",
  state_champion: "State Champion",
  state_placer: "State Placer",
  state_qualifier: "State Qualifier",
  na: "N/A",
}

type Submission = {
  id: string
  first_name: string
  last_name: string
  parent_email?: string | null
  cell_phone: string
  graduation_year: string
  highest_achievement: string
  weight_class: string | null
  high_school: string | null
  club: string | null
  comments: string | null
  created_at: string
  status?: string | null
  regional?: string | null
  placement?: string | null
  placement_2026?: string | null
  invite_id: string | null
  invite_sent: boolean
  enrolled: boolean
}

export default function AdminBlueInterestPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [exporting, setExporting] = useState(false)
  const [createInviteRow, setCreateInviteRow] = useState<Submission | null>(null)
  const [createInviteEmail, setCreateInviteEmail] = useState("")
  const [createInviteNote, setCreateInviteNote] = useState("")
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [updatingFieldId, setUpdatingFieldId] = useState<string | null>(null)
  const [zeroRowsHint, setZeroRowsHint] = useState(false)
  const { toast } = useToast()
  const loadIdRef = useRef(0)
  const lastCountRef = useRef(0)

  const loadSubmissions = useCallback(async (retryCount = 0, retryOnEmpty = false) => {
    const thisLoadId = loadIdRef.current + 1
    loadIdRef.current = thisLoadId
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/blue-express-interest?t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" },
      })
      const data = await res.json()

      const isAuthError = res.status === 401 || res.status === 403
      const shouldRetry =
        !isAuthError &&
        retryCount < 5 &&
        (res.status === 500 ||
          res.status === 503 ||
          (res.status === 200 && !data.ok))
      if (shouldRetry) {
        await new Promise((r) => setTimeout(r, 600 + retryCount * 800))
        return loadSubmissions(retryCount + 1, false)
      }

      if (!data.ok) {
        throw new Error(data.error || "Failed to load")
      }
      const list = Array.isArray(data.submissions) ? data.submissions : []
      setZeroRowsHint(list.length === 0 && !!data.zeroRowsHint)
      if (thisLoadId !== loadIdRef.current) return

      if (list.length === 0 && !retryOnEmpty) {
        await new Promise((r) => setTimeout(r, 1500))
        if (loadIdRef.current !== thisLoadId) return
        loadSubmissions(0, true)
        return
      }
      if (list.length === 0 && retryOnEmpty && lastCountRef.current > 0) return
      lastCountRef.current = list.length
      setSubmissions(list)
    } catch (e) {
      if (thisLoadId !== loadIdRef.current) return
      const err = e instanceof Error ? e : new Error("Failed to load submissions")
      setError(err.message)
    } finally {
      if (thisLoadId === loadIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && !loading) {
        loadSubmissions()
      }
    }
    window.addEventListener("visibilitychange", onFocus)
    return () => window.removeEventListener("visibilitychange", onFocus)
  }, [loadSubmissions, loading])

  const handleExportSpreadsheet = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/admin/blue-express-interest/export-csv", {
        method: "GET",
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to export" }))
        throw new Error(err.error || "Failed to export")
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `blue-interest-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({ title: "Export complete", description: "Submissions exported as CSV" })
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Could not export",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const openCreateInvite = (row: Submission) => {
    setCreateInviteRow(row)
    setCreateInviteEmail((row.parent_email ?? "").trim())
    setCreateInviteNote("")
  }

  const patchField = async (id: string, field: "status" | "regional" | "placement", value: string | null) => {
    setUpdatingFieldId(id)
    try {
      const res = await fetch("/api/admin/blue-express-interest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, [field]: value === "" ? null : value }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || `Failed to update ${field}`, variant: "destructive" })
        return
      }
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value || null } : s)))
    } catch {
      toast({ title: `Failed to update ${field}`, variant: "destructive" })
    } finally {
      setUpdatingFieldId(null)
    }
  }

  const handleStatusChange = (id: string, value: string) => patchField(id, "status", value === BLANK_VALUE ? null : value)
  const handleRegionalChange = (id: string, value: string) => patchField(id, "regional", value === BLANK_VALUE ? null : value)
  const handlePlacementChange = (id: string, value: string) => patchField(id, "placement", value === BLANK_VALUE ? null : value)

  /*
   * One button for the whole acceptance: mints the registration link if the family needs one,
   * sends the welcome with the steps in it, and marks the row. The Create invite flow below
   * stays for the cases that need a hand-written note instead.
   */
  /*
   * A hundred and four rows, of which most are finished business - texted, invited, enrolled or
   * declined - and the new ones arrive at the bottom of all of it. The list opens on what still
   * needs a decision; the rest is a click away rather than in the way.
   */
  const [view, setView] = useState<"open" | "invited" | "done" | "all">("open")
  /*
   * Seventeen of the open rows are wrestlers who have already graduated - they cannot join, and
   * they will never become actionable, so they sit in the queue forever. Hidden unless asked for.
   */
  const CURRENT_CLASS = 2027
  const [showGraduated, setShowGraduated] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [closing, setClosing] = useState(false)

  const hasGraduated = (r: Submission) =>
    typeof r.graduation_year === "number" && r.graduation_year < CURRENT_CLASS


  const isDone = (r: Submission) =>
    r.enrolled || r.status === "registered" || r.status === "declined"
  const isInvited = (r: Submission) => !isDone(r) && (r.invite_sent || r.status === "invite_sent")
  const isOpen = (r: Submission) => !isDone(r) && !isInvited(r)

  const counts = {
    open: submissions.filter(isOpen).length,
    invited: submissions.filter(isInvited).length,
    done: submissions.filter(isDone).length,
    all: submissions.length,
  }

  const visible = submissions
    .filter((r) => (showGraduated ? true : !hasGraduated(r)))
    .filter((r) =>
      view === "all" ? true : view === "open" ? isOpen(r) : view === "invited" ? isInvited(r) : isDone(r),
    )

  const graduatedHidden = showGraduated ? 0 : submissions.filter(hasGraduated).length

  /* Clear a backlog in one pass rather than sixty-one dropdowns. */
  const closeSelected = async () => {
    if (!selected.size) return
    if (!window.confirm(`Mark ${selected.size} submission${selected.size === 1 ? "" : "s"} as declined?`)) return
    setClosing(true)
    const ids = [...selected]
    let failed = 0
    for (const id of ids) {
      const res = await fetch("/api/admin/blue-express-interest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status: "declined" }),
      }).catch(() => null)
      if (!res || !res.ok) failed++
    }
    setSubmissions((prev) =>
      prev.map((r) => (selected.has(r.id) && !failed ? { ...r, status: "declined" } : r)),
    )
    setSelected(new Set())
    setClosing(false)
    toast(
      failed
        ? { title: `${ids.length - failed} closed, ${failed} failed`, variant: "destructive" }
        : { title: `${ids.length} closed` },
    )
    if (failed) void loadSubmissions()
  }

  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const acceptIntoBlue = async (row: Submission) => {
    if (!row.parent_email?.trim()) {
      toast({ title: "No email on this row", description: "Add a parent email before sending the welcome.", variant: "destructive" })
      return
    }
    if (!window.confirm(`Send the Blue welcome to ${row.parent_email.trim()}?`)) return
    setAcceptingId(row.id)
    try {
      const res = await fetch("/api/admin/blue/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interestId: row.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || "Could not send", variant: "destructive" })
        return
      }
      toast({ title: "Welcome sent", description: `To ${data.to}` })
      loadSubmissions()
    } catch {
      toast({ title: "Could not send", variant: "destructive" })
    } finally {
      setAcceptingId(null)
    }
  }

  const handleCreateInvite = async () => {
    if (!createInviteRow || !createInviteEmail.trim()) {
      toast({ title: "Email required", variant: "destructive" })
      return
    }
    setCreatingInvite(true)
    try {
      const res = await fetch("/api/admin/blue/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: createInviteEmail.trim(),
          notes: createInviteNote.trim() || undefined,
          interestId: createInviteRow.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || "Failed to create invite", variant: "destructive" })
        setCreatingInvite(false)
        return
      }
      toast({
        title: data.emailSent ? "Invite created and sent" : "Invite created",
        description: data.emailSent ? `Sent to ${createInviteEmail.trim()}` : "Copy the link from the Invites page.",
      })
      setCreateInviteRow(null)
      loadSubmissions()
    } catch {
      toast({ title: "Failed to create invite", variant: "destructive" })
    } finally {
      setCreatingInvite(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/blue" prefetch={false}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
                <Users className="h-7 w-7 text-[#D3B574]" />
                Blue Interest Forms
              </h1>
              <p className="text-sm text-slate-400">
                State qualifier interest. Accept a family and the welcome goes out with their private registration link.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportSpreadsheet}
              disabled={exporting || submissions.length === 0}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span className="ml-2">Export CSV</span>
            </Button>
            <Button onClick={() => loadSubmissions()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </div>

        {error && isBlueAuthError(error) && (
          <BlueAdminAuthBanner returnTo="/admin/blue/interest" />
        )}

        <Card className="border-[#1e3a5f] bg-[#0F1E32]">
          <CardHeader>
            <CardTitle className="text-white">Submissions</CardTitle>
            <CardDescription className="text-slate-400">
              Showing {visible.length} of {submissions.length}. Checkboxes show invite sent and enrolled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <>
                <p className="mb-4 text-sm text-red-600">{error}</p>
                {error.includes("does not exist") && (
                  <Card className="mb-6 border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-base">Create the table in Supabase</CardTitle>
                      <CardDescription className="text-slate-400">
                        In Supabase Dashboard go to SQL Editor and run the following. Then click Refresh above.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="overflow-x-auto rounded bg-white p-4 text-xs border border-amber-200 whitespace-pre-wrap">
{`create table if not exists public.blue_express_interest (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  cell_phone text not null,
  graduation_year text not null,
  highest_achievement text not null check (highest_achievement in (
    'all_american', 'state_champion', 'state_placer', 'state_qualifier', 'na'
  )),
  high_school text,
  club text,
  comments text,
  created_at timestamptz not null default now()
);

alter table public.blue_express_interest enable row level security;

create policy "Allow anonymous insert for express interest form"
  on public.blue_express_interest for insert to anon with check (true);

create policy "Service role can read all"
  on public.blue_express_interest for select to service_role using (true);

create policy "Service role can update all"
  on public.blue_express_interest for update to service_role using (true) with check (true);

alter table public.blue_express_interest
  add column if not exists high_school text,
  add column if not exists club text,
  add column if not exists comments text,
  add column if not exists weight_class text,
  add column if not exists parent_email text,
  add column if not exists status text,
  add column if not exists regional text,
  add column if not exists placement text;`}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : visible.length === 0 ? (
              <div className="py-8 space-y-4">
                <p className="text-center text-slate-400">
                  {submissions.length === 0
                    ? "No submissions yet."
                    : view === "open"
                      ? "Nothing waiting — every submission has been invited, enrolled or declined."
                      : "Nothing in this view."}
                </p>
                {zeroRowsHint && (
                  <div className="max-w-xl mx-auto rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-medium">Seeing zero rows but you have data in Supabase?</p>
                    <p className="mt-2">In <strong>Vercel → Project → Settings → Environment Variables</strong>, set <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> or <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY_OVERRIDE</code> to the <strong>service role</strong> key (Supabase Dashboard → Settings → API → <code className="bg-amber-100 px-1 rounded">service_role</code> secret), not the anon key. Use the same Supabase project as your data. Then redeploy and refresh.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Four states, each with its count, so the size of the queue is visible. */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["open", `Needs action (${counts.open})`],
                      ["invited", `Invited (${counts.invited})`],
                      ["done", `Enrolled or closed (${counts.done})`],
                      ["all", `All (${counts.all})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setView(key)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        view === key
                          ? "bg-[#D3B574] text-[#0A1628]"
                          : "bg-white/10 text-slate-300 hover:bg-white/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}

                  <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={showGraduated}
                      onChange={(e) => setShowGraduated(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Show graduated{graduatedHidden ? ` (${graduatedHidden} hidden)` : ""}
                  </label>
                </div>

                {selected.size > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/10 px-3 py-2">
                    <span className="text-sm text-slate-200">{selected.size} selected</span>
                    <Button size="sm" onClick={() => void closeSelected()} disabled={closing}>
                      {closing ? "Closing…" : "Mark as declined"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="text-sm text-slate-300 underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1e3a5f] hover:bg-transparent [&>th]:text-slate-300">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all shown"
                          className="h-4 w-4"
                          checked={visible.length > 0 && visible.every((r) => selected.has(r.id))}
                          onChange={(e) =>
                            setSelected(e.target.checked ? new Set(visible.map((r) => r.id)) : new Set())
                          }
                        />
                      </TableHead>
                      <TableHead className="w-[110px]">Submitted</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[90px]">Regional</TableHead>
                      <TableHead className="w-[90px]">Placement</TableHead>
                      <TableHead className="w-10 text-center">Invite sent</TableHead>
                      <TableHead className="w-10 text-center">Enrolled</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>High school</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Cell</TableHead>
                      <TableHead>Grad year</TableHead>
                      <TableHead>Highest achievement</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((row) => (
                      <TableRow key={row.id} className="border-[#1e3a5f] hover:bg-white/[0.04]">
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.first_name} ${row.last_name}`}
                            className="h-4 w-4"
                            checked={selected.has(row.id)}
                            onChange={(e) =>
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(row.id)
                                else next.delete(row.id)
                                return next
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-slate-300">
                          {new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.status ?? BLANK_VALUE}
                            onValueChange={(value) => handleStatusChange(row.id, value)}
                            disabled={updatingFieldId === row.id}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {updatingFieldId === row.id && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.regional ?? BLANK_VALUE}
                            onValueChange={(value) => handleRegionalChange(row.id, value)}
                            disabled={updatingFieldId === row.id}
                          >
                            <SelectTrigger className="h-8 w-[90px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {REGIONAL_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.placement ?? BLANK_VALUE}
                            onValueChange={(value) => handlePlacementChange(row.id, value)}
                            disabled={updatingFieldId === row.id}
                          >
                            <SelectTrigger className="h-8 w-[90px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {PLACEMENT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.placement_2026 ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.invite_sent ? (
                            <Checkbox checked disabled className="pointer-events-none" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.enrolled ? (
                            <Checkbox checked disabled className="pointer-events-none" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.first_name} {row.last_name}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm" title={row.parent_email ?? ""}>
                          {row.parent_email || "—"}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate" title={row.high_school ?? ""}>
                          {row.high_school || "—"}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate" title={row.club ?? ""}>
                          {row.club || "—"}
                        </TableCell>
                        <TableCell>{row.weight_class ? `${row.weight_class} lbs` : "—"}</TableCell>
                        <TableCell>{formatPhoneForDisplay(row.cell_phone)}</TableCell>
                        <TableCell>{row.graduation_year}</TableCell>
                        <TableCell>
                          {ACHIEVEMENT_LABELS[row.highest_achievement] ?? row.highest_achievement}
                        </TableCell>
                        <TableCell className="min-w-[200px] max-w-[400px] whitespace-normal text-sm align-top">
                          {row.comments || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.enrolled ? (
                            <span className="text-sm text-emerald-400">Enrolled</span>
                          ) : row.invite_sent ? (
                            <Link href="/admin/blue/invites" className="text-sm text-[#D3B574] hover:underline">
                              View invite
                            </Link>
                          ) : (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-[#03154C] hover:bg-[#04205f]"
                                disabled={acceptingId === row.id}
                                onClick={() => void acceptIntoBlue(row)}
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                {acceptingId === row.id ? "Sending…" : "Accept & send welcome"}
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={`/api/admin/blue/accept?interestId=${encodeURIComponent(row.id)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Preview
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openCreateInvite(row)}>
                                Invite link only
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!createInviteRow} onOpenChange={(open) => !open && setCreateInviteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create invite</DialogTitle>
            <DialogDescription>
              Send an invite for {createInviteRow ? `${createInviteRow.first_name} ${createInviteRow.last_name}` : ""}. Enter the parent/guardian email. The invite will be linked to this interest form so it shows as “Invite sent” and “Enrolled” when they complete registration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email (required)</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="parent@example.com"
                value={createInviteEmail}
                onChange={(e) => setCreateInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-note">Personal note (optional)</Label>
              <Input
                id="invite-note"
                placeholder="Add a note for the email"
                value={createInviteNote}
                onChange={(e) => setCreateInviteNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateInviteRow(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvite}
              disabled={creatingInvite || !createInviteEmail.trim()}
            >
              {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="ml-2">Create invite</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
