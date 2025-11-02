"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AnalyticsData {
  id: string
  user_id: string | null
  event_type: string
  page_url: string
  referrer: string | null
  user_agent: string | null
  ip_address: string | null
  created_at: string
  user_profiles?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

interface PageStat {
  page_url: string
  views: number
  unique_users: number
}

interface AnalyticsResponse {
  data: AnalyticsData[]
  summary: PageStat[]
  total_views: number
  date_range: {
    start: string
    days: number
  }
}

export default function UserAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/analytics/page-views?days=${days}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setError("You need to be logged in to view analytics")
        } else if (response.status === 403) {
          setError("Admin access required. Please contact an administrator to grant you admin privileges.")
        } else {
          setError(data.error || `HTTP ${response.status}`)
        }
        return
      }

      if (data.error) {
        setError(data.error)
        return
      }

      setAnalytics(data)
    } catch (err) {
      console.error("Fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getUserName = (item: AnalyticsData) => {
    if (!item.user_profiles) return "Anonymous"
    const { first_name, last_name, email } = item.user_profiles
    if (first_name && last_name) return `${first_name} ${last_name}`
    if (email) return email
    return "Unknown User"
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">Loading analytics...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Access Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={fetchAnalytics}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Analytics</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <Button key={d} variant={days === d ? "default" : "outline"} onClick={() => setDays(d)} size="sm">
              {d} days
            </Button>
          ))}
        </div>
      </div>

      {analytics && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total_views}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unique Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.summary.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">Last {analytics.date_range.days} days</div>
              </CardContent>
            </Card>
          </div>

          {/* Page Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Pages</CardTitle>
              <CardDescription>Most visited pages in the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.summary.length > 0 ? (
                  analytics.summary
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 10)
                    .map((stat, index) => (
                      <div key={stat.page_url} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <span className="text-sm">{stat.page_url}</span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>{stat.views} views</span>
                          <span>{stat.unique_users} users</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No page views recorded yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest page views from users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analytics.data.length > 0 ? (
                  analytics.data.slice(0, 50).map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 border-b">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.page_url}</div>
                        <div className="text-xs text-gray-600">
                          {getUserName(item)} • {formatDate(item.created_at)}
                        </div>
                      </div>
                      {item.referrer && (
                        <div className="text-xs text-gray-500 max-w-xs truncate">from: {item.referrer}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
