"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

/**
 * Admin drill-down: exactly who viewed one athlete's profile, without signing in as them.
 *
 * Names are admin-only. The athlete's own panel shows counts with no identities — see
 * lib/profile-view-stats.ts for why. This dialog reads a different endpoint for that reason.
 */

type Viewer = {
  userId: string | null
  name: string
  email: string | null
  role: string
  kind: string
  isCoach: boolean
  isCollegeCoach: boolean
  verifiedCoach: boolean
  institution: string | null
  views: number
  firstViewed: string
  lastViewed: string
}

type Star = { userId: string; name: string; program: string | null; at: string; auto: boolean }
type Report = { userId: string; name: string; program: string | null; opens: number; downloads: number; lastAt: string }

type Payload = {
  athleteName: string | null
  totalViews: number
  anonymousViews: number
  identifiedViewers: number
  coachViewers: number
  collegeCoachViewers: number
  viewers: Viewer[]
  stars?: Star[]
  scoutingReports?: Report[]
}

const KIND_LABEL: Record<string, string> = {
  college_coach: "College coach",
  hs_coach: "HS/club coach",
  athlete: "Athlete",
  parent: "Parent",
  admin: "Admin",
  fan: "Fan",
  other: "Other",
  anonymous: "Signed out",
}

function badgeClass(v: Viewer): string {
  if (v.isCollegeCoach) return "bg-green-100 text-green-800 hover:bg-green-100"
  if (v.isCoach) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
  if (v.kind === "admin") return "bg-purple-100 text-purple-800 hover:bg-purple-100"
  if (v.kind === "anonymous") return "bg-gray-100 text-gray-600 hover:bg-gray-100"
  return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

function when(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function ProfileViewersDialog({
  athleteId,
  athleteName,
  open,
  onOpenChange,
}: {
  athleteId: string | null
  athleteName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !athleteId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/analytics/profile-viewers?athleteId=${encodeURIComponent(athleteId)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
        if (!cancelled) setData(json as Payload)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load viewers")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, athleteId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.athleteName || athleteName || "This profile"}: views, stars and scouting reports</DialogTitle>
          <DialogDescription>
            {loading
              ? "Loading…"
              : data
                ? `${data.totalViews} views · ${data.identifiedViewers} signed-in ${
                    data.identifiedViewers === 1 ? "viewer" : "viewers"
                  } · ${data.coachViewers} ${data.coachViewers === 1 ? "coach" : "coaches"} (${
                    data.collegeCoachViewers
                  } college)${data.anonymousViews ? ` · ${data.anonymousViews} signed out` : ""}`
                : "Admin only — the athlete sees counts, not names."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading viewers…
          </div>
        )}

        {error && <p className="py-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && data && (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {/* Three separate metrics (Matt, 5 Nov 2026): a star or a report is not a view. */}
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Profile views", data.totalViews],
                ["Stars", data.stars?.length ?? 0],
                ["Scouting reports", data.scoutingReports?.length ?? 0],
              ].map(([label, n]) => (
                <div key={label as string} className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{n}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {data.stars?.length ? (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold text-gray-900">Stars</p>
                {data.stars.map((st) => (
                  <div key={st.userId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-gray-900">{st.name}</span>
                        {st.auto ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                            Added by system on commitment
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-gray-500">{st.program ?? "—"}</p>
                    </div>
                    <p className="flex-shrink-0 text-xs text-gray-500">{when(st.at)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {data.scoutingReports?.length ? (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold text-gray-900">Scouting reports</p>
                {data.scoutingReports.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <span className="truncate font-medium text-gray-900">{r.name}</span>
                      <p className="truncate text-xs text-gray-500">{r.program ?? "—"}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm text-gray-900">
                        {r.opens} opened{r.downloads ? ` · ${r.downloads} downloaded` : ""}
                      </p>
                      <p className="text-xs text-gray-500">{when(r.lastAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="pt-2 text-sm font-semibold text-gray-900">Profile views</p>
            {data.viewers.length === 0 ? (
              <p className="py-6 text-sm text-gray-500">No views recorded for this athlete yet.</p>
            ) : (
              data.viewers.map((v, i) => (
                <div
                  key={v.userId ?? `anon-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-gray-900">{v.name}</span>
                      <Badge variant="outline" className={badgeClass(v)}>
                        {KIND_LABEL[v.kind] ?? v.kind}
                      </Badge>
                      {v.verifiedCoach && v.isCoach && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {[v.institution, v.email].filter(Boolean).join(" · ") || (v.userId ? "—" : "No account")}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-semibold text-gray-900">
                      {v.views} <span className="text-xs font-normal text-gray-500">views</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.firstViewed && v.firstViewed !== v.lastViewed
                        ? `${when(v.firstViewed)} – ${when(v.lastViewed)}`
                        : when(v.lastViewed)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
