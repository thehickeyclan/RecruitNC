"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"

interface AdminStats {
  totalAthletes: number
  totalUsers: number
  pendingSubmissions: number
  recentActivity: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalAthletes: 0,
    totalUsers: 0,
    pendingSubmissions: 0,
    recentActivity: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats/overview")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Error fetching admin stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your wrestling portal content and settings</p>
      </div>

      {/* Quick Links */}
      <Card className="mb-8 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🚀 Quick Links</CardTitle>
          <CardDescription>Frequently used tools</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin/match-linker">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">🔗 Match Linker</Button>
          </Link>
          <Link href="/admin/college-coaches">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">🎓 College Coaches</Button>
          </Link>
          <Link href="/admin/users">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">👥 Manage Users</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">👥</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Athletes</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.totalAthletes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">🔐</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">⏳</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.pendingSubmissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">📊</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.recentActivity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🎓 College Coaches</CardTitle>
            <CardDescription>Manage college coach accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/college-coaches">
              <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white">
                🏠 Coach Dashboard
              </Button>
            </Link>
            <Link href="/admin/schools">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🏫 Schools Management
              </Button>
            </Link>
            <Link href="/admin/users-dashboard">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ✅ User Management & Approvals
              </Button>
            </Link>
            <Link href="/admin/coach-verification">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🔍 Verify Credentials
              </Button>
            </Link>
            <Link href="/admin/coach-analytics">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Coach Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Media Management */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🖼️ Media Management</CardTitle>
            <CardDescription>Manage images, logos, and media assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/unified-media-manager">
              <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                🚀 Unified Media Manager
              </Button>
            </Link>
            <Link href="/admin/media-manager-v2">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📁 Media Manager v2
              </Button>
            </Link>
            <Link href="/admin/enhanced-media-manager">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ⚡ Enhanced Media Manager
              </Button>
            </Link>
            <Link href="/admin/logo-manager-pro">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🎨 Logo Manager Pro
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Logo Management */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🎨 Logo Management</CardTitle>
            <CardDescription>Manage school and organization logos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/logo-management-system">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🏢 Logo Management System
              </Button>
            </Link>
            <Link href="/admin/logo-consistency-checker">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ✅ Logo Consistency Checker
              </Button>
            </Link>
            <Link href="/admin/deduplicate-logos">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🔄 Deduplicate Logos
              </Button>
            </Link>
            <Link href="/admin/enhanced-logo-manager">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ⚙️ Enhanced Logo Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Profile Management */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">👤 Profile Management</CardTitle>
            <CardDescription>Handle profile confirmations and claims</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/profile-confirmations">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ✅ Profile Confirmations
              </Button>
            </Link>
            <Link href="/admin/athlete-claims-manager">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🔐 Athlete Claims Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Athletes Management */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🤼 Athletes Management</CardTitle>
            <CardDescription>Manage athlete profiles and data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/athletes">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                👥 View All Athletes
              </Button>
            </Link>
            <Link href="/admin/athletes/add">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ➕ Add New Athlete
              </Button>
            </Link>
            <Link href="/admin/athletes/bulk-import">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Bulk Import Athletes
              </Button>
            </Link>
            <Link href="/admin/bulk-athlete-processor">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ⚡ Bulk Athlete Processor
              </Button>
            </Link>
            <Link href="/admin/athlete-image-manager">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🖼️ Athlete Image Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Match Management */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🥇 Match Management</CardTitle>
            <CardDescription>Manage wrestling match records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/match-records">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📋 Match Records
              </Button>
            </Link>
            <Link href="/admin/bulk-match-upload">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Bulk Match Upload
              </Button>
            </Link>
            <Link href="/admin/match-linker">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🔗 Match Linker
              </Button>
            </Link>
            <Link href="/admin/match-manager">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ⚙️ Match Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">👥 User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/users">
              <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                👤 All Users & Profiles
              </Button>
            </Link>
            <Link href="/admin/users-dashboard">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Users Dashboard
              </Button>
            </Link>
            <Link href="/admin/user-analytics">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📈 User Analytics
              </Button>
            </Link>
            <Link href="/admin/card-analytics">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Card Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Content Management */}
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📝 Content Management</CardTitle>
            <CardDescription>Handle submissions and edit requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/commitment-submissions">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📋 Commitment Submissions
              </Button>
            </Link>
            <Link href="/admin/edit-requests">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                ✏️ Edit Requests
              </Button>
            </Link>
            <Link href="/admin/submissions">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📄 All Submissions
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border-pink-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🗄️ Data Management</CardTitle>
            <CardDescription>Manage divisions, colleges, and mappings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/college-division-mapping">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🏫 College Division Mapping
              </Button>
            </Link>
            <Link href="/admin/college-master">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🎓 College Master
              </Button>
            </Link>
            <Link href="/admin/standardize-divisions">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Standardize Divisions
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Rankings */}
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🏆 Rankings</CardTitle>
            <CardDescription>Manage prospect and athlete rankings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/prospects/simple-ranking">
              <Button className="w-full justify-start bg-yellow-600 hover:bg-yellow-700 text-white">
                📊 Simple Rankings (RecruitNC Scores)
              </Button>
            </Link>
            <Link href="/admin/prospects/ranking">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🥇 Prospect Rankings (Drag & Drop)
              </Button>
            </Link>
            <Link href="/admin/rankings/publish">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📢 Publish Rankings
              </Button>
            </Link>
            <Link href="/admin/rankings/suggestions">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🤖 AI Ranking Suggestions
              </Button>
            </Link>
            <Link href="/admin/init-rankings">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🚀 Initialize Rankings
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Database Tools */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🛠️ Database Tools</CardTitle>
            <CardDescription>Database maintenance and scripts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/debug">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                🐛 Debug Tools
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Analytics & Reports */}
        <Card className="border-cyan-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📊 Analytics & Reports</CardTitle>
            <CardDescription>View statistics and generate reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/stats">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📈 Statistics Dashboard
              </Button>
            </Link>
            <Link href="/admin/commitment-stats">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Commitment Statistics
              </Button>
            </Link>
            <Link href="/admin/division-distribution">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Division Distribution
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
