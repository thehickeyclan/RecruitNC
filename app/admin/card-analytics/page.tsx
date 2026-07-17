"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Loader2, Eye, Users, TrendingUp, User, RefreshCw, Calendar } from "lucide-react"
import { ProfileViewersDialog } from "@/components/admin/profile-viewers-dialog"

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] as const
type RangeValue = (typeof RANGE_OPTIONS)[number]["value"]

interface CardView {
  id: number
  event_type: string
  event_data: {
    athlete_id: string
    athlete_name: string
    profile_type: string
    timestamp: string
  }
  created_at: string
  user_profiles?: {
    profile_type: string
    email: string
    first_name: string
    last_name: string
  }
}

interface AthleteStats {
  athlete_id: string
  athlete_name: string
  total_views: number
  /** Legacy grouping by the unmaintained profile_type column — kept for reference only. */
  profile_types: Record<string, number>
  /** Grouped by real role via lib/viewer-role.ts. Use this. */
  viewer_kinds: Record<string, number>
}

interface ProfileClickRank {
  athlete_id: string
  athlete_name: string
  clicks: number
  lastViewed?: string
  /** Coach rows only: distinct people, which matters more than raw clicks. */
  distinctCoaches?: number
  collegeCoachViews?: number
}

interface CoachSummary {
  coachViews: number
  distinctCoaches: number
  collegeCoachViews: number
  distinctCollegeCoaches: number
}

export default function CardAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeValue>("all")
  const [cardViews, setCardViews] = useState<CardView[]>([])
  const [topAthletes, setTopAthletes] = useState<AthleteStats[]>([])
  const [profileClickRanking, setProfileClickRanking] = useState<ProfileClickRank[]>([])
  const [profileViewRankingCoaches, setProfileViewRankingCoaches] = useState<ProfileClickRank[]>([])
  const [viewerKindStats, setViewerKindStats] = useState<Record<string, number>>({})
  const [totalViews, setTotalViews] = useState(0)
  const [coachSummary, setCoachSummary] = useState<CoachSummary | null>(null)
  const [viewersFor, setViewersFor] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [range])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (range && range !== "all") params.set("range", range)
      const url = `/api/admin/analytics/card-views${params.toString() ? `?${params.toString()}` : ""}`
      const response = await fetch(url, { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch analytics")
      }

      setCardViews(data.cardViews || [])
      setTopAthletes(data.topAthletes || [])
      setProfileClickRanking(data.profileClickRanking || [])
      setProfileViewRankingCoaches(data.profileViewRankingCoaches || [])
      setViewerKindStats(data.viewerKindStats || {})
      setTotalViews(data.totalViews || 0)
      setCoachSummary(data.coachSummary || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handles both the viewer_kind values from lib/viewer-role.ts (underscored: college_coach,
  // hs_coach) and the legacy profile_type spellings (hyphenated), since the Recent Views list
  // below still reports the raw profile_type it recorded.
  const formatProfileType = (type: string) => {
    const typeMap: Record<string, string> = {
      parent: "Parent",
      college_coach: "College Coach",
      "college-coach": "College Coach",
      hs_coach: "HS/Club Coach",
      "hs-club-coach": "HS/Club Coach",
      coach: "Coach",
      athlete: "Athlete",
      fan: "Fan",
      referee: "Referee",
      media: "Media",
      admin: "Admin",
      other: "Other",
      anonymous: "Anonymous",
    }
    return typeMap[type] || type
  }

  const getProfileTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      parent: "bg-blue-100 text-blue-800",
      college_coach: "bg-green-100 text-green-800",
      "college-coach": "bg-green-100 text-green-800",
      hs_coach: "bg-yellow-100 text-yellow-800",
      "hs-club-coach": "bg-yellow-100 text-yellow-800",
      coach: "bg-yellow-100 text-yellow-800",
      athlete: "bg-purple-100 text-purple-800",
      fan: "bg-gray-100 text-gray-800",
      referee: "bg-orange-100 text-orange-800",
      media: "bg-indigo-100 text-indigo-800",
      admin: "bg-pink-100 text-pink-800",
      other: "bg-slate-100 text-slate-700",
      anonymous: "bg-slate-100 text-slate-800",
    }
    return colorMap[type] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading analytics...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile View Analytics</h1>
          <p className="text-gray-600">When coaches and visitors view athlete public profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={range} onValueChange={(v) => setRange(v as RangeValue)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{totalViews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Top Athletes</p>
                <p className="text-2xl font-bold">{topAthletes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Was "Profile Types: N" — a count of distinct labels, which answers nothing.
            College-coach interest is the number this page exists to surface. */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">College Coach Views</p>
                <p className="text-2xl font-bold">{(coachSummary?.collegeCoachViews ?? 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {coachSummary?.distinctCollegeCoaches ?? 0} distinct{" "}
                  {coachSummary?.distinctCollegeCoaches === 1 ? "coach" : "coaches"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Views</p>
                <p className="text-2xl font-bold">{cardViews.length}</p>
                {totalViews > cardViews.length && (
                  <p className="text-xs text-gray-500">of {totalViews.toLocaleString()} total</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most viewed by everyone (anyone who clicks / opens a profile) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Most Viewed by Everyone
          </CardTitle>
          <CardDescription>
            Athletes whose public profile pages are viewed or clicked the most, by anyone (coaches, parents, recruits, anonymous visitors).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {profileClickRanking.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No profile-view data yet. Views will appear when anyone opens athlete public profiles.</p>
            ) : (
              profileClickRanking.map((row, index) => (
                <div
                  key={row.athlete_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/view-profile?id=${encodeURIComponent(row.athlete_id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline truncate block"
                      >
                        {row.athlete_name}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">
                        {row.lastViewed
                          ? `Last viewed: ${new Date(row.lastViewed).toLocaleString()}`
                          : row.athlete_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{row.clicks}</span>
                      <span className="text-sm text-gray-500 ml-1">views</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewersFor({ id: row.athlete_id, name: row.athlete_name })}
                    >
                      Who viewed
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Most viewed by coaches only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Viewed by Coaches
          </CardTitle>
          <CardDescription>
            Viewers whose <strong>role</strong> is a college or HS/club coach. Admins are excluded — they
            account for ~1,000 views and aren&apos;t recruiting interest. Click any athlete to see exactly
            who viewed them.
          </CardDescription>
          {coachSummary && (
            <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
              {[
                { label: "Coach views", value: coachSummary.coachViews },
                { label: "Distinct coaches", value: coachSummary.distinctCoaches },
                { label: "College coach views", value: coachSummary.collegeCoachViews },
                { label: "College coaches", value: coachSummary.distinctCollegeCoaches },
              ].map((t) => (
                <div key={t.label} className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-2xl font-bold text-gray-900">{t.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">{t.label}</p>
                </div>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {profileViewRankingCoaches.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No coach profile-view data yet. Views will appear when coaches open athlete public profiles.</p>
            ) : (
              profileViewRankingCoaches.map((row, index) => (
                <div
                  key={row.athlete_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/view-profile?id=${encodeURIComponent(row.athlete_id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline truncate block"
                      >
                        {row.athlete_name}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">
                        {row.lastViewed
                          ? `Last viewed: ${new Date(row.lastViewed).toLocaleString()}`
                          : row.athlete_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{row.clicks}</span>
                      <span className="text-sm text-gray-500 ml-1">coach views</span>
                      {row.distinctCoaches != null && (
                        <p className="text-xs text-gray-500">
                          {row.distinctCoaches} {row.distinctCoaches === 1 ? "coach" : "coaches"}
                          {row.collegeCoachViews ? ` · ${row.collegeCoachViews} college` : ""}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewersFor({ id: row.athlete_id, name: row.athlete_name })}
                    >
                      Who viewed
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Athletes */}
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Athletes</CardTitle>
            <CardDescription>
              Athletes with the most profile page views, broken down by who the viewer actually is.
              Popular isn&apos;t the same as recruited — check the coach counts above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAthletes.slice(0, 10).map((athlete, index) => (
                <div
                  key={athlete.athlete_id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex min-w-0 items-center space-x-3">
                    <div className="flex flex-shrink-0 items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{athlete.athlete_name}</p>
                      <p className="text-sm text-gray-500">{athlete.total_views} views</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {Object.entries(athlete.viewer_kinds ?? {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([kind, count]) => (
                          <Badge key={kind} variant="secondary" className={`text-xs ${getProfileTypeColor(kind)}`}>
                            {formatProfileType(kind)}: {count}
                          </Badge>
                        ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewersFor({ id: athlete.athlete_id, name: athlete.athlete_name })}
                    >
                      Who
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Viewer breakdown — by real role, not the stale profile_type column */}
        <Card>
          <CardHeader>
            <CardTitle>Who&apos;s Viewing</CardTitle>
            <CardDescription>
              Every profile view grouped by the viewer&apos;s actual role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(viewerKindStats)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge className={getProfileTypeColor(type)}>{formatProfileType(type)}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{count}</p>
                      <p className="text-sm text-gray-500">{((count / totalViews) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Profile Views</CardTitle>
          <CardDescription>
            {totalViews > cardViews.length
              ? `Showing ${cardViews.length.toLocaleString()} most recent of ${totalViews.toLocaleString()} total`
              : "Latest profile page visits (one per visit)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cardViews.slice(0, 200).map((view) => (
              <div key={view.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{view.event_type.replace("_", " ")}</Badge>
                  <div>
                    <p className="font-medium">{view.event_data?.athlete_name || "Unknown Athlete"}</p>
                    <p className="text-sm text-gray-500">{new Date(view.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <Badge
                  className={getProfileTypeColor(
                    view.event_data?.profile_type || view.user_profiles?.profile_type || "anonymous",
                  )}
                >
                  {formatProfileType(view.event_data?.profile_type || view.user_profiles?.profile_type || "anonymous")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ProfileViewersDialog
        athleteId={viewersFor?.id ?? null}
        athleteName={viewersFor?.name}
        open={viewersFor !== null}
        onOpenChange={(open) => !open && setViewersFor(null)}
      />
    </div>
  )
}
