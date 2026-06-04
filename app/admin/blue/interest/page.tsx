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
  { value: "approved", label: "Approved" },
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
  parent_email?: string | null
  approval_email_sent_at?: string | null
}

export default function AdminBlueInterestPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [exporting, setExporting] = useState(false)
  const [approvalRow, setApprovalRow] = useState<Submission | null>(null)
  const [approvalEmail, setApprovalEmail] = useState("")
  const [approvalParentName, setApprovalParentName] = useState("")
  const [approvalNote, setApprovalNote] = useState("")
  const [sendingApproval, setSendingApproval] = useState(false)
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

  const openSendApproval = (row: Submission) => {
    setApprovalRow(row)
    setApprovalEmail(row.parent_email?.trim() ?? "")
    setApprovalParentName("")
    setApprovalNote("")
  }

  const handleSendApproval = async () => {
    if (!approvalRow || !approvalEmail.trim()) {
      toast({ title: "Email required", variant: "destructive" })
      return
    }
    setSendingApproval(true)
    try {
      const res = await fetch("/api/admin/blue-express-interest/send-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: approvalRow.id,
          email: approvalEmail.trim(),
          parentName: approvalParentName.trim() || undefined,
          personalNote: approvalNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast({ title: data.error || "Failed to send approval email", variant: "destructive" })
        return
      }
      toast({
        title: "Approval email sent",
        description: data.warning ? `${data.sentTo} — ${data.warning}` : `Sent to ${data.sentTo}`,
      })
      setApprovalRow(null)
      loadSubmissions()
    } catch {
      toast({ title: "Failed to send approval email", variant: "destructive" })
    } finally {
      setSendingApproval(false)
    }
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/blue" prefetch={false}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#13294B] flex items-center gap-2">
                <Users className="h-7 w-7 text-[#D3B574]" />
                Blue Interest Forms
              </h1>
              <p className="text-sm text-gray-600">
                State qualifier interest. Send approval email (includes registration link) when ready to enroll.
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

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}. Checkboxes show invite sent and enrolled.
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
                      <CardDescription>
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
            ) : submissions.length === 0 ? (
              <div className="py-8 space-y-4">
                <p className="text-center text-gray-500">No submissions yet.</p>
                {zeroRowsHint && (
                  <div className="max-w-xl mx-auto rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-medium">Seeing zero rows but you have data in Supabase?</p>
                    <p className="mt-2">In <strong>Vercel → Project → Settings → Environment Variables</strong>, set <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> or <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY_OVERRIDE</code> to the <strong>service role</strong> key (Supabase Dashboard → Settings → API → <code className="bg-amber-100 px-1 rounded">service_role</code> secret), not the anon key. Use the same Supabase project as your data. Then redeploy and refresh.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[90px]">Regional</TableHead>
                      <TableHead className="w-[90px]">Placement</TableHead>
                      <TableHead className="w-10 text-center">Invite sent</TableHead>
                      <TableHead className="w-10 text-center">Enrolled</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>High school</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Cell</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Grad year</TableHead>
                      <TableHead>Highest achievement</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((row) => (
                      <TableRow key={row.id}>
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
                        <TableCell className="max-w-[140px] truncate" title={row.high_school ?? ""}>
                          {row.high_school || "—"}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate" title={row.club ?? ""}>
                          {row.club || "—"}
                        </TableCell>
                        <TableCell>{row.weight_class ? `${row.weight_class} lbs` : "—"}</TableCell>
                        <TableCell>{formatPhoneForDisplay(row.cell_phone)}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm" title={row.parent_email ?? ""}>
                          {row.parent_email || "—"}
                        </TableCell>
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
                            <span className="text-sm text-green-600">Enrolled</span>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              {!row.approval_email_sent_at && row.status !== "approved" && row.status !== "invite_sent" && (
                                <Button variant="outline" size="sm" onClick={() => openSendApproval(row)}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Send approval
                                </Button>
                              )}
                              {(row.approval_email_sent_at || row.invite_sent) && (
                                <span className="text-xs text-emerald-700">Approval / invite sent</span>
                              )}
                              {row.invite_sent && (
                                <Link href="/admin/blue/invites" className="text-sm text-[#03154C] hover:underline">
                                  View invite
                                </Link>
                              )}
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

      <Dialog open={!!approvalRow} onOpenChange={(open) => !open && setApprovalRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send approval email</DialogTitle>
            <DialogDescription>
              {approvalRow
                ? `Approval + registration link for ${approvalRow.first_name} ${approvalRow.last_name}. Creates a private invite and emails the parent to complete enrollment.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="approval-email">Parent/guardian email (required)</Label>
              <Input
                id="approval-email"
                type="email"
                placeholder="parent@example.com"
                value={approvalEmail}
                onChange={(e) => setApprovalEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-parent-name">Parent first name (optional)</Label>
              <Input
                id="approval-parent-name"
                placeholder="Jane"
                value={approvalParentName}
                onChange={(e) => setApprovalParentName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-note">Personal note (optional)</Label>
              <Input
                id="approval-note"
                placeholder="We loved watching you at states…"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalRow(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendApproval} disabled={sendingApproval || !approvalEmail.trim()}>
              {sendingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span className="ml-2">Send approval email</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
