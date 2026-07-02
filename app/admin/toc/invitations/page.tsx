"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TocInviteShareCard } from "@/components/toc/admin/toc-invite-share-card"
import { TocInviteReminderCard } from "@/components/toc/admin/toc-invite-reminder-card"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, CreditCard, Loader2, RefreshCw, Send, UserCheck, Users } from "lucide-react"
import { buildTocAthleteInviteMessage, type TocInviteMessage } from "@/lib/toc/invite-message"
import { confirmPageUrl, registrationPayPageUrl } from "@/lib/toc/invitation-service"
import { formatTocGradYear, suggestTocInviteWeight, tocWeightProfileHint } from "@/lib/toc/invitations"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

type SearchAthlete = {
  id: string
  name: string
  graduationyear: number | null
  weightclass: string | number | null
  highschool: string | null
}

type InvitationRow = {
  id: string
  athlete_id: string
  weight_class: number
  status: string
  invited_at: string | null
  confirmed_at: string | null
  jacket_size: string | null
  payment_status: string | null
  paid_at: string | null
  last_reminder_at: string | null
  last_reminder_body: string | null
  athletes: { id: string; name: string; highschool: string | null; graduationyear: number | null } | null
}

export default function TocInvitationsAdminPage() {
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchAthlete[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState<SearchAthlete | null>(null)
  const [inviteWeight, setInviteWeight] = useState(String(TOC_WEIGHT_CLASSES[4]))
  const [sendEmail, setSendEmail] = useState(true)
  const [sending, setSending] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [lastShare, setLastShare] = useState<TocInviteMessage | null>(null)
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null)
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null)
  const [weightSavingId, setWeightSavingId] = useState<string | null>(null)

  const previewShare = useMemo(() => {
    if (!selectedAthlete) return null
    return buildTocAthleteInviteMessage({
      athleteName: selectedAthlete.name,
      weightClass: Number(inviteWeight),
      athleteId: selectedAthlete.id,
    })
  }, [selectedAthlete, inviteWeight])

  const reminderRow = useMemo(
    () => (expandedReminderId ? invitations.find((r) => r.id === expandedReminderId) ?? null : null),
    [expandedReminderId, invitations],
  )

  const inviteStats = useMemo(() => {
    const invited = invitations.length
    const accepted = invitations.filter((row) => row.status === "confirmed").length
    const paid = invitations.filter((row) => row.payment_status === "paid").length
    const pendingConfirm = invitations.filter((row) => row.status === "invited").length
    const pendingPayment = Math.max(0, accepted - paid)
    return { invited, accepted, paid, pendingConfirm, pendingPayment }
  }, [invitations])

  const loadInvitations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/invitations")
      const data = await res.json()
      if (!res.ok) {
        if (data.migrationRequired) {
          throw new Error(data.error)
        }
        throw new Error(data.error || "Failed to load")
      }
      setInvitations(data.invitations ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInvitations()
  }, [loadInvitations])

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/admin/athletes/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`)
        const data = await res.json()
        setSearchResults(data.athletes ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const sendInvite = async () => {
    if (!selectedAthlete) return
    setSending(true)
    setInviteMessage(null)
    setLastShare(null)
    try {
      const res = await fetch("/api/admin/toc/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          weightClass: Number(inviteWeight),
          sendEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to invite")

      if (data.share) setLastShare(data.share as TocInviteMessage)

      if (data.warning) {
        setInviteMessage(data.warning)
      } else if (data.emailed) {
        setInviteMessage(`Invitation saved and email sent to athlete/parent on file.`)
      } else {
        setInviteMessage(`Invitation saved — copy the text or link below and send manually.`)
      }

      setSelectedAthlete(null)
      setSearchQuery("")
      void loadInvitations()
    } catch (e) {
      setInviteMessage(e instanceof Error ? e.message : "Failed to invite")
    } finally {
      setSending(false)
    }
  }

  const shareForRow = (row: InvitationRow): TocInviteMessage =>
    buildTocAthleteInviteMessage({
      athleteName: row.athletes?.name ?? "Athlete",
      weightClass: row.weight_class,
      confirmUrl: confirmPageUrl(row.athlete_id),
    })

  const updateWeight = async (row: InvitationRow, weightClass: number) => {
    if (weightClass === row.weight_class) return
    setWeightSavingId(row.id)
    try {
      const res = await fetch(`/api/admin/toc/invitations/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightClass }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update weight")
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === row.id ? { ...inv, weight_class: weightClass } : inv)),
      )
      if (expandedShareId === row.id) {
        setExpandedShareId(null)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update weight")
    } finally {
      setWeightSavingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/toc">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">TOC invitations</h1>
            <p className="text-sm text-muted-foreground">Preview, send, or copy invite text · <HardLink href="/admin/toc/field" className="text-[#B31B1B] hover:underline">Field by weight</HardLink></p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadInvitations()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-[#002147]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invited</CardTitle>
            <Users className="h-4 w-4 text-[#002147]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{loading ? "—" : inviteStats.invited}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : inviteStats.pendingConfirm > 0
                  ? `${inviteStats.pendingConfirm} awaiting confirm`
                  : "Invitations issued"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#CC0000]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
            <UserCheck className="h-4 w-4 text-[#CC0000]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{loading ? "—" : inviteStats.accepted}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : inviteStats.invited > 0
                  ? `${Math.round((inviteStats.accepted / inviteStats.invited) * 100)}% of invited`
                  : "Verbal confirms"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{loading ? "—" : inviteStats.paid}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : inviteStats.pendingPayment > 0
                  ? `${inviteStats.pendingPayment} confirmed, unpaid`
                  : inviteStats.accepted > 0
                    ? "All confirmed athletes paid"
                    : "Registration fees received"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin-athlete-search">Search athletes</Label>
              <Input
                id="admin-athlete-search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedAthlete(null)
                  setLastShare(null)
                }}
                placeholder="Type name…"
              />
              {searchLoading ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
              {searchResults.length > 0 && !selectedAthlete ? (
                <ul className="border rounded-md divide-y max-h-48 overflow-auto">
                  {searchResults.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          setSelectedAthlete(a)
                          setSearchQuery(a.name)
                          setSearchResults([])
                          setLastShare(null)
                          setInviteWeight(String(suggestTocInviteWeight(a.weightclass)))
                        }}
                      >
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {[a.highschool, formatTocGradYear(a.graduationyear), a.weightclass].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Invited weight class</Label>
                <Select value={inviteWeight} onValueChange={setInviteWeight}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOC_WEIGHT_CLASSES.map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w} lbs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAthlete ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tocWeightProfileHint(selectedAthlete.weightclass, Number(inviteWeight))}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You choose the bracket — usually their RecruitNC profile weight or the closest college class.
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
                Send email automatically (athlete/parent email on file)
              </label>
              <Button
                type="button"
                className="bg-[#002147]"
                disabled={!selectedAthlete || sending}
                onClick={() => void sendInvite()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Issue invitation
              </Button>
            </div>
          </div>

          {previewShare && selectedAthlete ? (
            <TocInviteShareCard share={previewShare} title={`Preview for ${selectedAthlete.name}`} />
          ) : null}

          {inviteMessage ? <p className="text-sm font-medium text-[#002147]">{inviteMessage}</p> : null}

          {lastShare ? <TocInviteShareCard share={lastShare} title="Copy and send manually" /> : null}
        </CardContent>
      </Card>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All invitations ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlete</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Jacket</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead>Last text</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.athletes?.name ?? row.athlete_id.slice(0, 8)}</TableCell>
                  <TableCell>{row.athletes?.highschool ?? "—"}</TableCell>
                  <TableCell className="min-w-[120px]">
                    {row.status === "declined" || row.status === "withdrew" ? (
                      <span>{row.weight_class} lbs</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={String(row.weight_class)}
                          disabled={weightSavingId === row.id}
                          onValueChange={(value) => void updateWeight(row, Number(value))}
                        >
                          <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TOC_WEIGHT_CLASSES.map((w) => (
                              <SelectItem key={w} value={String(w)}>
                                {w} lbs
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {weightSavingId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "confirmed" ? "default" : "secondary"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.payment_status === "paid" ? (
                      <Badge className="bg-green-700 hover:bg-green-700">paid</Badge>
                    ) : row.status === "confirmed" ? (
                      <a
                        href={registrationPayPageUrl(row.athlete_id)}
                        className="text-xs text-[#002147] underline underline-offset-2"
                      >
                        {row.payment_status ?? "unpaid"}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{row.jacket_size ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.invited_at ? new Date(row.invited_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.confirmed_at ? new Date(row.confirmed_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.last_reminder_at ? new Date(row.last_reminder_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          setExpandedReminderId(row.id)
                          setExpandedShareId(null)
                        }}
                      >
                        Text reminder
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          setExpandedShareId(expandedShareId === row.id ? null : row.id)
                          setExpandedReminderId(null)
                        }}
                      >
                        {expandedShareId === row.id ? "Hide invite" : "Copy invite"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No invitations yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {expandedShareId ? (() => {
            const row = invitations.find((r) => r.id === expandedShareId)
            if (!row) return null
            return <TocInviteShareCard share={shareForRow(row)} title="Invite copy" compact />
          })() : null}

        </CardContent>
      </Card>

      <Dialog open={!!reminderRow} onOpenChange={(open) => !open && setExpandedReminderId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Text reminder</DialogTitle>
            <DialogDescription>
              {reminderRow?.athletes?.name ?? "Athlete"} — edit the message, then send via RecruitNC (Twilio).
            </DialogDescription>
          </DialogHeader>
          {reminderRow ? (
            <TocInviteReminderCard
              key={reminderRow.id}
              invitationId={reminderRow.id}
              athleteName={reminderRow.athletes?.name ?? "Athlete"}
              lastReminderAt={reminderRow.last_reminder_at}
              onSent={(lastReminderAt, lastReminderBody) => {
                setInvitations((prev) =>
                  prev.map((inv) =>
                    inv.id === reminderRow.id
                      ? { ...inv, last_reminder_at: lastReminderAt, last_reminder_body: lastReminderBody }
                      : inv,
                  ),
                )
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
