"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, RefreshCw, Send } from "lucide-react"
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
  const [sending, setSending] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  const loadInvitations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/invitations")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
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
    try {
      const res = await fetch("/api/admin/toc/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          weightClass: Number(inviteWeight),
          sendEmail: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.warning || "Failed to invite")
      setInviteMessage(data.warning ?? `Invitation sent. Confirm link: ${data.confirmUrl}`)
      setSelectedAthlete(null)
      setSearchQuery("")
      void loadInvitations()
    } catch (e) {
      setInviteMessage(e instanceof Error ? e.message : "Failed to invite")
    } finally {
      setSending(false)
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
            <p className="text-sm text-muted-foreground">Issue invites and track confirmed field</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadInvitations()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
                        }}
                      >
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {[a.highschool, a.graduationyear, a.weightclass].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
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
              <Button
                type="button"
                className="mt-2 bg-[#002147]"
                disabled={!selectedAthlete || sending}
                onClick={() => void sendInvite()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send invitation
              </Button>
            </div>
          </div>
          {inviteMessage ? <p className="text-sm text-muted-foreground break-all">{inviteMessage}</p> : null}
        </CardContent>
      </Card>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All invitations ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlete</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jacket</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Confirmed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.athletes?.name ?? row.athlete_id.slice(0, 8)}</TableCell>
                  <TableCell>{row.athletes?.highschool ?? "—"}</TableCell>
                  <TableCell>{row.weight_class} lbs</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "confirmed" ? "default" : "secondary"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{row.jacket_size ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.invited_at ? new Date(row.invited_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.confirmed_at ? new Date(row.confirmed_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No invitations yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
