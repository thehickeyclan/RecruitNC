"use client"

import { useCallback, useEffect, useState } from "react"
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
import { RefreshCw, Loader2, Users, ArrowLeft, FileSpreadsheet, Mail, Check } from "lucide-react"

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
  const { toast } = useToast()

  const loadSubmissions = useCallback(async (retryCount = 0) => {
    const maxRetries = 4
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/blue-express-interest", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" },
      })
      const data = await res.json()

      const shouldRetry =
        retryCount < maxRetries &&
        (res.status === 401 || res.status === 403 || res.status === 500 || (res.status === 200 && !data.ok))
      if (shouldRetry) {
        await new Promise((r) => setTimeout(r, 500 + retryCount * 600))
        return loadSubmissions(retryCount + 1)
      }

      if (!data.ok) {
        throw new Error(data.error || "Failed to load")
      }
      const list = Array.isArray(data.submissions) ? data.submissions : []
      setSubmissions(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadSubmissions(), 400)
    return () => clearTimeout(t)
  }, [loadSubmissions])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && error && !loading) {
        loadSubmissions()
      }
    }
    window.addEventListener("visibilitychange", onFocus)
    return () => window.removeEventListener("visibilitychange", onFocus)
  }, [loadSubmissions, error, loading])

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
    setCreateInviteEmail("")
    setCreateInviteNote("")
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/blue">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#13294B] flex items-center gap-2">
                <Users className="h-7 w-7 text-[#D3B574]" />
                Blue Interest Forms
              </h1>
              <p className="text-sm text-gray-600">
                State qualifier interest. Create invites and track who has been invited and who enrolled.
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

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}. Checkboxes show invite sent and enrolled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">Invite sent</TableHead>
                      <TableHead className="w-10 text-center">Enrolled</TableHead>
                      <TableHead>Name</TableHead>
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
                    {submissions.map((row) => (
                      <TableRow key={row.id}>
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
                        <TableCell>{row.cell_phone}</TableCell>
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
                          ) : row.invite_sent ? (
                            <Link href="/admin/blue/invites" className="text-sm text-[#03154C] hover:underline">
                              View invite
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCreateInvite(row)}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Create invite
                            </Button>
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
