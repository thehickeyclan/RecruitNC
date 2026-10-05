"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminHeader } from "@/components/admin-header"
import { Check, Loader2, X, ArrowRight } from "lucide-react"

type Candidate = {
  athleteId: string
  name: string
  school: string | null
  club: string | null
  graduationYear: number | null
  gender: string | null
  photoUrl: string | null
  signals: string[]
}

type Row = {
  id: string
  reason: string
  result: { name: string; event: string; year: number | null; detail: string; school: string | null; state: string | null }
  candidates: Candidate[]
}

/**
 * Results the matcher could not settle on its own: is this our wrestler?
 *
 * Each decision is stored and final - a later import never asks again or overwrites it. Rows left
 * alone keep working exactly as before, through name matching.
 */
export default function IdentityReviewPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/admin/identity-links", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load")
        setRows(data.rows ?? [])
        setCounts(data.counts ?? {})
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  async function decide(row: Row, action: "link" | "reject", athleteId?: string) {
    setBusy(row.id + (athleteId ?? action))
    setError("")
    try {
      const res = await fetch(`/api/admin/identity-links/${row.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, athleteId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save")
      setRows((current) => current.filter((r) => r.id !== row.id))
      setCounts((c) => ({ ...c, review: Math.max(0, (c.review ?? 1) - 1), [action === "link" ? "linked" : "rejected"]: (c[action === "link" ? "linked" : "rejected"] ?? 0) + 1 }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(null)
    }
  }

  const visible = rows.filter((r) => !skipped.has(r.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-[#03154C]">Is this our wrestler?</h1>
          <p className="mt-1 text-sm text-gray-600">
            Tournament results the matcher could not confirm on its own. Each answer is saved for good — an import
            never asks again. Anything you leave keeps working exactly as it does today.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{counts.review ?? 0} to review</Badge>
            <Badge variant="outline">{counts.linked ?? 0} linked</Badge>
            <Badge variant="outline">{counts.rejected ?? 0} not him</Badge>
            {skipped.size ? <Badge variant="outline">{skipped.size} skipped this visit</Badge> : null}
          </div>
        </div>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : !visible.length ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-600">Nothing to review.</CardContent>
          </Card>
        ) : null}

        {visible.map((row) => (
          <Card key={row.id}>
            <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto_1.4fr] md:items-start">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">The result</p>
                <p className="mt-1 text-lg font-bold text-[#03154C]">{row.result.name}</p>
                <p className="text-sm text-gray-800">
                  {row.result.year} {row.result.event}
                </p>
                {row.result.detail ? <p className="text-sm text-gray-600">{row.result.detail}</p> : null}
                <p className="mt-1 text-sm text-gray-600">
                  {row.result.school ? `School listed: ${row.result.school}` : "No school listed"}
                  {row.result.state ? ` · ${row.result.state}` : ""}
                </p>
                <p className="mt-2 text-xs italic text-gray-500">Why it is here: {row.reason}</p>
              </div>

              <ArrowRight className="hidden h-5 w-5 self-center text-gray-400 md:block" aria-hidden />

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {row.candidates.length > 1 ? "Which profile?" : "Our profile"}
                </p>
                {row.candidates.map((c) => (
                  <div key={c.athleteId} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
                    {c.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/view-profile?id=${c.athleteId}`} target="_blank" className="font-semibold text-[#03154C] hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-600">
                        {[c.school, c.club, c.graduationYear ? `Class of ${c.graduationYear}` : null].filter(Boolean).join(" · ")}
                      </p>
                      {c.signals.length ? <p className="text-[11px] text-gray-500">{c.signals.join(" · ")}</p> : null}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void decide(row, "link", c.athleteId)}
                      disabled={busy !== null}
                      className="bg-[#03154C] text-white hover:bg-[#0a2a6e]"
                    >
                      {busy === row.id + c.athleteId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                      Same wrestler
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => void decide(row, "reject")} disabled={busy !== null}>
                    {busy === row.id + "reject" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                    {row.candidates.length > 1 ? "None of these" : row.candidates[0]?.gender === "Female" ? "Not her" : "Not him"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSkipped((s) => new Set(s).add(row.id))} disabled={busy !== null}>
                    Skip
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
