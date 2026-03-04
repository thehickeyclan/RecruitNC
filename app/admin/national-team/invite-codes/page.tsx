"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, KeyRound, Copy, Check } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { getEventSlugsForAdmin, getEventName, getUrlSlugForRegistration } from "@/lib/national-team-events"

type InviteCodeRow = {
  id: string
  event_slug: string
  code: string
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  created_at: string
}

const eventSlugsForAdmin = getEventSlugsForAdmin()

export default function AdminNationalTeamInviteCodesPage() {
  const [selectedEventSlug, setSelectedEventSlug] = useState<string>(eventSlugsForAdmin[0] ?? "nhsca-duals-2026")
  const [codes, setCodes] = useState<InviteCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCode, setNewCode] = useState("")
  const [newMaxUses, setNewMaxUses] = useState("")
  const [newExpiresDays, setNewExpiresDays] = useState("30")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const registerPath = `/national-team/register/${getUrlSlugForRegistration(selectedEventSlug)}`
  const registrationUrl = `${baseUrl}${registerPath}`

  const loadCodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/national-team/invite-codes?event=${encodeURIComponent(selectedEventSlug)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setCodes(data.codes ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load codes")
      setCodes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [selectedEventSlug])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const codeTrim = newCode.trim()
    if (!codeTrim) {
      setCreateError("Enter a code.")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/admin/national-team/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventSlug: selectedEventSlug,
          code: codeTrim,
          maxUses: newMaxUses.trim() ? parseInt(newMaxUses, 10) : undefined,
          expiresInDays: newExpiresDays.trim() ? parseInt(newExpiresDays, 10) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create")
      setCodes((prev) => [data.code, ...prev])
      setNewCode("")
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create code")
    } finally {
      setCreating(false)
    }
  }

  const copyRegistrationUrl = () => {
    navigator.clipboard.writeText(registrationUrl).then(() => {
      setCopiedUrl(registrationUrl)
      setTimeout(() => setCopiedUrl(null), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin/national-team"><ArrowLeft className="h-4 w-4" /></HardLink>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-[#D3B574]" />
              Invite codes
            </h1>
            <p className="text-sm text-gray-600">Select an event, create codes, and share the private registration link with invitees.</p>
          </div>
        </div>

        <Card className="mb-6 border-[#D3B574]/50">
          <CardHeader>
            <CardTitle className="text-lg">Event</CardTitle>
            <CardDescription>Choose the event. The registration URL and codes below are for this event.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Select value={selectedEventSlug} onValueChange={setSelectedEventSlug}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {eventSlugsForAdmin.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {getEventName(slug)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="mb-6 border-[#D3B574]/50">
          <CardHeader>
            <CardTitle className="text-lg">Registration URL (private link)</CardTitle>
            <CardDescription>Share this link only with invited families. They will also need an invite code to complete registration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <code className="flex-1 min-w-0 text-sm bg-gray-100 px-3 py-2 rounded break-all">{registrationUrl}</code>
            <Button variant="outline" size="sm" onClick={copyRegistrationUrl}>
              {copiedUrl === registrationUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">Copy</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Create invite code</CardTitle>
            <CardDescription>Codes are unique per event. Set max uses or leave blank for unlimited. Optional expiry in days.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 min-w-[180px]">
                <Label htmlFor="newCode">Code</Label>
                <Input
                  id="newCode"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="NHSCA2026-ABC123"
                  disabled={creating}
                />
              </div>
              <div className="space-y-2 min-w-[100px]">
                <Label htmlFor="maxUses">Max uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={0}
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  disabled={creating}
                />
              </div>
              <div className="space-y-2 min-w-[100px]">
                <Label htmlFor="expiresDays">Expires (days)</Label>
                <Input
                  id="expiresDays"
                  type="number"
                  min={1}
                  value={newExpiresDays}
                  onChange={(e) => setNewExpiresDays(e.target.value)}
                  disabled={creating}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className="ml-2">Create code</span>
              </Button>
              {createError && <p className="text-sm text-red-600 w-full">{createError}</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Existing codes</CardTitle>
            <CardDescription>Event: {getEventName(selectedEventSlug)}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
              </div>
            ) : error ? (
              <p className="text-red-600 py-4">{error}</p>
            ) : codes.length === 0 ? (
              <p className="text-gray-500 py-4">No invite codes yet. Create one above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Max uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.code}</TableCell>
                      <TableCell>{row.uses_count}</TableCell>
                      <TableCell>{row.max_uses ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
