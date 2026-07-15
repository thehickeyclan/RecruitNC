"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HardLink } from "@/components/hard-link"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Check, Loader2, RefreshCw, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Candidate = {
  id: string
  name: string
  highschool: string | null
  graduationyear: unknown
}

type MatchRow = {
  id: number
  wrestler_name: string
  school: string
  year: string
  record: string
  wins: number
  match_status: string
  match_confidence: number | null
  match_reasons: unknown
  athlete_id: string | null
  linked_athlete: Candidate | null
  name_candidates: Candidate[]
}

export default function AdminHistoricalMatchesPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<MatchRow[]>([])
  const [needsReviewCount, setNeedsReviewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("needs_review")
  const [savingId, setSavingId] = useState<number | null>(null)
  const [picked, setPicked] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/data-dawg/historical-matches?status=${encodeURIComponent(statusFilter)}`,
        { cache: "no-store", credentials: "include" },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setItems(data.items ?? [])
      setNeedsReviewCount(data.needsReviewCount ?? 0)
      const defaults: Record<number, string> = {}
      for (const row of data.items ?? []) {
        const first =
          row.linked_athlete?.id ||
          row.athlete_id ||
          row.name_candidates?.[0]?.id ||
          ""
        if (first) defaults[row.id] = first
      }
      setPicked(defaults)
    } catch (e) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/data-dawg/historical-matches")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void load()
  }, [user, isAdmin, authLoading, load])

  async function act(id: number, action: "approve" | "reject" | "unresolved") {
    setSavingId(id)
    try {
      const body: Record<string, string> = { action }
      if (action === "approve") {
        const athleteId = picked[id]
        if (!athleteId) throw new Error("Pick an athlete before approving")
        body.athlete_id = athleteId
      }
      const res = await fetch(`/api/admin/data-dawg/historical-matches/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      toast({ title: "Updated", description: `Row ${id} → ${action}` })
      await load()
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <HardLink href="/admin/data-dawg/analytics" className="inline-flex items-center gap-1 text-sm text-[#003366] underline">
            <ArrowLeft className="w-4 h-4" />
            Analytics
          </HardLink>
          <HardLink href="/history/records/single-season-wins" className="text-sm underline text-slate-600">
            Public leaderboard
          </HardLink>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historical identity matches</CardTitle>
            <CardDescription>
              Review uncertain links for NCHSAA single-season wins. Pending review:{" "}
              <strong>{needsReviewCount}</strong>
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs_review">Needs review</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="all">Needs review + unmatched</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="manually_confirmed">Manually confirmed</SelectItem>
                  <SelectItem value="manually_rejected">Manually rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <p className="text-slate-500 text-sm">No rows for this filter.</p>
            ) : (
              items.map((row) => {
                const candidates =
                  row.name_candidates.length > 0
                    ? row.name_candidates
                    : row.linked_athlete
                      ? [row.linked_athlete]
                      : []
                return (
                  <div key={row.id} className="border rounded-lg p-4 bg-white space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#003366]">
                          {row.wrestler_name}{" "}
                          <span className="font-normal text-slate-600">
                            · {row.school} · {row.year} · {row.record}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          confidence {row.match_confidence ?? "—"} ·{" "}
                          {Array.isArray(row.match_reasons)
                            ? row.match_reasons.join(", ")
                            : String(row.match_reasons ?? "")}
                        </p>
                      </div>
                      <Badge variant="outline">{row.match_status}</Badge>
                    </div>

                    {candidates.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-700">Proposed / candidates</p>
                        <Select
                          value={picked[row.id] || ""}
                          onValueChange={(v) => setPicked((p) => ({ ...p, [row.id]: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select athlete" />
                          </SelectTrigger>
                          <SelectContent>
                            {candidates.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} · {c.highschool || "?"} · class {String(c.graduationyear ?? "?")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700">No athlete candidates found by exact name.</p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="bg-green-700 hover:bg-green-800"
                        disabled={savingId === row.id || !picked[row.id]}
                        onClick={() => void act(row.id, "approve")}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={savingId === row.id}
                        onClick={() => void act(row.id, "reject")}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingId === row.id}
                        onClick={() => void act(row.id, "unresolved")}
                      >
                        Leave unresolved
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
