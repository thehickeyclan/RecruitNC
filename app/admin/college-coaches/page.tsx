"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { CheckCircle, Clock, Users, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"

interface CoachStats {
  totalCoaches: number
  pendingApprovals: number
  verifiedCoaches: number
  activeRecruiters: number
}

export default function CollegeCoachesDashboard() {
  const [stats, setStats] = useState<CoachStats>({
    totalCoaches: 0,
    pendingApprovals: 0,
    verifiedCoaches: 0,
    activeRecruiters: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/coach-stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching coach stats:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">College Coaches Management</h1>
        <p className="text-gray-600">Manage college coach accounts, approvals, and recruiting activity</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Coaches</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.totalCoaches}</p>
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
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.pendingApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified Coaches</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.verifiedCoaches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Recruiters</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.activeRecruiters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Actions
            </CardTitle>
            <CardDescription>Review and approve new coach registrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/coach-approvals">
              <Button className="w-full justify-start bg-yellow-600 hover:bg-yellow-700 text-white">
                <Clock className="w-4 h-4 mr-2" />
                Approve New Coaches ({stats.pendingApprovals})
              </Button>
            </Link>
            <Link href="/admin/coach-verification">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Coach Credentials
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Analytics & Insights
            </CardTitle>
            <CardDescription>Monitor coach activity and recruiting trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users?filter=coach">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Users className="w-4 h-4 mr-2" />
                View All Coach Profiles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Management Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Coach Management Tools</CardTitle>
          <CardDescription>Additional tools for managing college coaches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/coach-approvals">
              <Button variant="outline" className="w-full h-auto py-4 flex-col items-start bg-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Coach Approvals</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Review and approve college coaches to access athlete contact information
                </p>
              </Button>
            </Link>

            <Link href="/admin/coach-verification">
              <Button variant="outline" className="w-full h-auto py-4 flex-col items-start bg-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Credential Verification</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Verify coaching credentials and professional references
                </p>
              </Button>
            </Link>

            <Link href="/admin/coach-analytics">
              <Button variant="outline" className="w-full h-auto py-4 flex-col items-start bg-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold">Activity Analytics</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Track coach engagement and recruiting activity
                </p>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
