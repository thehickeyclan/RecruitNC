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
    <div className="min-h-screen bg-gray-50">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-blue-200">NC Wrestling United - Portal Management</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AdminHeader />

        {/* Quick Links */}
        <Card className="mb-8 border-t-4 border-t-[#B31B1B] shadow-md">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-2xl">🚀</span> Quick Links
            </CardTitle>
            <CardDescription>Frequently used management tools</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 pt-6">
            <Link href="/admin/athletes">
              <Button className="bg-[#002147] hover:bg-[#003366] text-white">👥 Manage Athletes</Button>
            </Link>
            <Link href="/admin/match-manager">
              <Button className="bg-[#B31B1B] hover:bg-[#8B1515] text-white">🔗 Match Manager</Button>
            </Link>
            <Link href="/admin/schools">
              <Button className="bg-[#002147] hover:bg-[#003366] text-white">🏫 Schools</Button>
            </Link>
            <Link href="/admin/profile-submissions">
              <Button className="bg-[#B31B1B] hover:bg-[#8B1515] text-white">📝 Profile Submissions</Button>
            </Link>
            <Link href="/admin/users-dashboard">
              <Button className="bg-[#002147] hover:bg-[#003366] text-white">🔐 Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-[#002147] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Athletes</p>
                <p className="text-3xl font-bold text-[#002147]">{loading ? "..." : stats.totalAthletes}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#B31B1B] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-[#B31B1B]">{loading ? "..." : stats.totalUsers}</p>
              </div>
              <div className="text-4xl">🔐</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#D4AF37] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending Submissions</p>
                <p className="text-3xl font-bold text-[#D4AF37]">{loading ? "..." : stats.pendingSubmissions}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#002147] shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Recent Activity</p>
                <p className="text-3xl font-bold text-[#002147]">{loading ? "..." : stats.recentActivity}</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">🎓</span> College Coaches
            </CardTitle>
            <CardDescription>Manage schools, coaches, and analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/schools">
              <Button className="w-full justify-start bg-[#002147] hover:bg-[#003366] text-white">
                🏫 Schools & Coaches
              </Button>
            </Link>
            <Link href="/admin/coach-analytics">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                📊 Coach Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Logo Management */}
        <Card className="border-t-4 border-t-[#B31B1B] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">🎨</span> Logo Management
            </CardTitle>
            <CardDescription>Manage logos for clubs, high schools, colleges, and divisions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/enhanced-logo-manager">
              <Button className="w-full justify-start bg-[#B31B1B] hover:bg-[#8B1515] text-white">
                🎨 Enhanced Logo Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Athletes Management */}
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">🤼</span> Athletes Management
            </CardTitle>
            <CardDescription>Manage athlete profiles and data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
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
        <Card className="border-t-4 border-t-[#B31B1B] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">🥇</span> Match Management
            </CardTitle>
            <CardDescription>Manage wrestling match data and results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/match-manager">
              <Button className="w-full justify-start bg-[#B31B1B] hover:bg-[#8B1515] text-white">
                ⚙️ Match Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">👥</span> User Management
            </CardTitle>
            <CardDescription>Manage user accounts, coaches, and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/users-dashboard">
              <Button className="w-full justify-start bg-[#002147] hover:bg-[#003366] text-white">
                👥 Users Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Submissions Management */}
        <Card className="border-t-4 border-t-[#B31B1B] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">📝</span> Submissions
            </CardTitle>
            <CardDescription>Review commitments, profile edits, and new submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/submissions-manager">
              <Button className="w-full justify-start bg-[#B31B1B] hover:bg-[#8B1515] text-white">
                📋 Submissions Manager
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Rankings */}
        <Card className="border-t-4 border-t-[#D4AF37] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">🏆</span> Rankings
            </CardTitle>
            <CardDescription>Manage prospect and athlete rankings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/prospects/simple-ranking">
              <Button className="w-full justify-start bg-[#D4AF37] hover:bg-[#C4A137] text-white">
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

        {/* Analytics & Reports */}
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-[#002147]">
              <span className="text-xl">📊</span> Analytics & Reports
            </CardTitle>
            <CardDescription>View commitment statistics and analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Link href="/admin/commitment-stats">
              <Button className="w-full justify-start bg-[#002147] hover:bg-[#003366] text-white">
                📊 Commitment Statistics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
