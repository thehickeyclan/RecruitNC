"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminHeader } from "@/components/admin-header"
import {
  Users,
  Clock,
  Eye,
  UserCheck,
  Activity,
  TrendingUp,
  Calendar,
  Loader2,
  RefreshCw,
  Building,
} from "lucide-react"

interface CoachStats {
  totalCoaches: number
  pendingApproval: number
  approvedCoaches: number
  rejectedCoaches: number
  activeToday: number
  activeLast7Days: number
  activeLast30Days: number
}

interface CoachActivity {
  user_id: string
  email: string
  full_name: string
  institution: string
  coaching_position: string
  verified_coach: boolean
  created_at: string
  last_login_at: string
  total_page_views: number
  total_profile_views: number
  unique_athletes_viewed: number
  avg_session_duration: number
  most_viewed_page: string
  last_activity: string
}

interface PageAccess {
  page_url: string
  view_count: number
  unique_coaches: number
}

interface ProfileView {
  athlete_id: string
  athlete_name: string
  view_count: number
  unique_coaches: number
  last_viewed: string
}

export default function CoachAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [coachActivity, setCoachActivity] = useState<CoachActivity[]>([])
  const [pageAccess, setPageAccess] = useState<PageAccess[]>([])
  const [profileViews, setProfileViews] = useState<ProfileView[]>([])
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/analytics/coach-activity?days=${timeRange}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch coach analytics")
      }

      setStats(data.stats)
      setCoachActivity(data.coachActivity)
      setPageAccess(data.pageAccess)
      setProfileViews(data.profileViews)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return "< 1 min"
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminHeader />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading coach analytics...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">College Coach Analytics</h1>
          <p className="text-gray-600">Track coach activity, engagement, and platform usage</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? "default" : "outline"}
              onClick={() => setTimeRange(days as 7 | 30 | 90)}
              size="sm"
            >
              {days} days
            </Button>
          ))}
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Coaches</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCoaches || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingApproval || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.approvedCoaches || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active ({timeRange}d)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timeRange === 7
                    ? stats?.activeLast7Days || 0
                    : timeRange === 30
                      ? stats?.activeLast30Days || 0
                      : stats?.activeLast30Days || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Eye className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Profile Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {coachActivity.reduce((sum, c) => sum + c.total_profile_views, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Calendar className="w-5 h-5 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Page Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {coachActivity.reduce((sum, c) => sum + c.total_page_views, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Most Accessed Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Most Accessed Pages</CardTitle>
            <CardDescription>Pages coaches visit most frequently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pageAccess.slice(0, 10).map((page, index) => (
                <div key={page.page_url} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{page.page_url}</p>
                      <p className="text-xs text-gray-500">{page.unique_coaches} coaches</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{page.view_count} views</Badge>
                </div>
              ))}
              {pageAccess.length === 0 && <div className="text-center text-gray-500 py-4">No page access data yet</div>}
            </div>
          </CardContent>
        </Card>

        {/* Most Viewed Profiles */}
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Athlete Profiles</CardTitle>
            <CardDescription>Athletes coaches are most interested in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileViews.slice(0, 10).map((profile, index) => (
                <div key={profile.athlete_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{profile.athlete_name}</p>
                      <p className="text-xs text-gray-500">
                        {profile.unique_coaches} coaches • {formatDate(profile.last_viewed)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{profile.view_count} views</Badge>
                </div>
              ))}
              {profileViews.length === 0 && (
                <div className="text-center text-gray-500 py-4">No profile views data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Coach Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Coach Activity</CardTitle>
          <CardDescription>Detailed activity breakdown for each college coach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coachActivity.map((coach) => (
              <div key={coach.user_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{coach.full_name}</h4>
                      {coach.verified_coach ? (
                        <Badge className="bg-green-100 text-green-800">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{coach.email}</p>
                    {coach.institution && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Building className="w-3 h-3" />
                        {coach.institution}
                        {coach.coaching_position && ` • ${coach.coaching_position}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-600">Last active</p>
                    <p className="font-medium">{formatDate(coach.last_activity || coach.last_login_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-600">Page Views</p>
                    <p className="text-lg font-bold">{coach.total_page_views}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Profile Views</p>
                    <p className="text-lg font-bold">{coach.total_profile_views}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Athletes Viewed</p>
                    <p className="text-lg font-bold">{coach.unique_athletes_viewed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Avg Session</p>
                    <p className="text-lg font-bold">{formatDuration(coach.avg_session_duration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Member Since</p>
                    <p className="text-sm font-medium">{new Date(coach.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {coach.most_viewed_page && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600">Most visited page</p>
                    <p className="text-sm font-medium">{coach.most_viewed_page}</p>
                  </div>
                )}
              </div>
            ))}
            {coachActivity.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No coach activity data available for the selected time range</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
