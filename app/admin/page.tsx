"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { 
  Users, Trophy, Target, UserCheck, Clock, 
  School, Pencil, BarChart3, Settings, FileText,
  TrendingUp, Zap
} from "lucide-react"

interface AdminStats {
  totalAthletes: number
  totalProspects: number
  totalCommits: number
  totalUsers: number
  totalCoaches: number
  pendingSubmissions: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalAthletes: 0,
    totalProspects: 0,
    totalCommits: 0,
    totalUsers: 0,
    totalCoaches: 0,
    pendingSubmissions: 0,
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
      <div className="bg-gradient-to-r from-[#13294B] to-[#1a3a5c] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-10 w-10 text-[#C8102E]" />
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-blue-200 text-lg">NC Wrestling United - Portal Management & Analytics</p>
            </div>
            <Link href="/">
              <Button className="bg-white text-[#13294B] hover:bg-gray-100">
                View Public Site
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AdminHeader />

        {/* Key Metrics - Top Priority */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#13294B] mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#C8102E]" />
            Key Platform Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Platform Users */}
            <Card className="border-l-4 border-l-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center">
                  <Users className="h-8 w-8 text-[#13294B] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Platform Users</p>
                  <p className="text-3xl font-bold text-[#13294B]">{loading ? "..." : stats.totalUsers}</p>
                </div>
              </CardContent>
            </Card>

            {/* Coaches */}
            <Card className="border-l-4 border-l-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-red-50">
                <div className="text-center">
                  <UserCheck className="h-8 w-8 text-[#C8102E] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Coaches</p>
                  <p className="text-3xl font-bold text-[#C8102E]">{loading ? "..." : stats.totalCoaches}</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Athletes */}
            <Card className="border-l-4 border-l-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center">
                  <Users className="h-8 w-8 text-[#13294B] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Athletes</p>
                  <p className="text-3xl font-bold text-[#13294B]">{loading ? "..." : stats.totalAthletes}</p>
                </div>
              </CardContent>
            </Card>

            {/* Commits */}
            <Card className="border-l-4 border-l-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-yellow-50">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-[#13294B] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Commits</p>
                  <p className="text-3xl font-bold text-[#13294B]">{loading ? "..." : stats.totalCommits}</p>
                </div>
              </CardContent>
            </Card>

            {/* Prospects */}
            <Card className="border-l-4 border-l-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center">
                  <Target className="h-8 w-8 text-[#13294B] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Prospects</p>
                  <p className="text-3xl font-bold text-[#13294B]">{loading ? "..." : stats.totalProspects}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pending Submissions */}
            <Card className="border-l-4 border-l-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-red-50">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-[#C8102E] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Pending</p>
                  <p className="text-3xl font-bold text-[#C8102E]">{loading ? "..." : stats.pendingSubmissions}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#13294B] mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6 text-[#C8102E]" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/admin/athletes">
              <Button className="w-full h-20 bg-gradient-to-br from-[#13294B] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#13294B] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <Users className="h-6 w-6" />
                <span className="text-sm font-semibold">Manage Athletes</span>
              </Button>
            </Link>
            <Link href="/admin/submissions-manager">
              <Button className="w-full h-20 bg-gradient-to-br from-[#C8102E] to-[#a00d25] hover:from-[#a00d25] hover:to-[#C8102E] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-sm font-semibold">Submissions</span>
              </Button>
            </Link>
            <Link href="/admin/schools">
              <Button className="w-full h-20 bg-gradient-to-br from-[#13294B] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#13294B] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <School className="h-6 w-6" />
                <span className="text-sm font-semibold">Schools</span>
              </Button>
            </Link>
            <Link href="/admin/match-manager">
              <Button className="w-full h-20 bg-gradient-to-br from-[#FFC72C] to-[#e6b328] hover:from-[#e6b328] hover:to-[#FFC72C] text-[#13294B] shadow-lg flex flex-col items-center justify-center gap-2 font-bold">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-semibold">Match Manager</span>
              </Button>
            </Link>
            <Link href="/admin/users-dashboard">
              <Button className="w-full h-20 bg-gradient-to-br from-[#13294B] to-[#1a3a5c] hover:from-[#1a3a5c] hover:to-[#13294B] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <UserCheck className="h-6 w-6" />
                <span className="text-sm font-semibold">Users</span>
              </Button>
            </Link>
            <Link href="/admin/commitment-stats">
              <Button className="w-full h-20 bg-gradient-to-br from-[#C8102E] to-[#a00d25] hover:from-[#a00d25] hover:to-[#C8102E] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm font-semibold">Statistics</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Management Categories */}
        <div>
          <h2 className="text-2xl font-bold text-[#13294B] mb-4 flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#C8102E]" />
            Management Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Athletes & Data */}
            <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <Users className="h-5 w-5" />
                  Athletes & Data
                </CardTitle>
                <CardDescription>Manage athlete profiles, records, and data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/athletes">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    👥 View All Athletes
                  </Button>
                </Link>
                <Link href="/admin/athletes/add">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    ➕ Add New Athlete
                  </Button>
                </Link>
                <Link href="/admin/match-manager">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    🤼 Match Manager
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Submissions & Requests */}
            <Card className="border-t-4 border-t-[#C8102E] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <FileText className="h-5 w-5" />
                  Submissions & Requests
                </CardTitle>
                <CardDescription>Review commitments, edits, and new profiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/submissions-manager">
                  <Button variant="outline" className="w-full justify-start hover:bg-red-50">
                    📋 Submissions Manager
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Schools & Coaches */}
            <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <School className="h-5 w-5" />
                  Schools & Coaches
                </CardTitle>
                <CardDescription>Manage schools, coaches, and recruiting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/schools">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    🏫 Schools & Coaches
                  </Button>
                </Link>
                <Link href="/admin/coach-analytics">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    📊 Coach Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Rankings */}
            <Card className="border-t-4 border-t-[#FFC72C] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <Trophy className="h-5 w-5" />
                  Rankings Manager
                </CardTitle>
                <CardDescription>Manage and publish prospect rankings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/prospects/simple-ranking">
                  <Button variant="outline" className="w-full justify-start hover:bg-yellow-50">
                    🏆 Prospect Rankings
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Users & Permissions */}
            <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <UserCheck className="h-5 w-5" />
                  Users & Permissions
                </CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/users-dashboard">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    👥 Users Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Media & Design */}
            <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <Pencil className="h-5 w-5" />
                  Media & Design
                </CardTitle>
                <CardDescription>Manage logos and media assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/enhanced-logo-manager">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50">
                    🎨 Enhanced Logo Manager
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Analytics & Reports */}
            <Card className="border-t-4 border-t-[#C8102E] shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <BarChart3 className="h-5 w-5" />
                  Analytics & Reports
                </CardTitle>
                <CardDescription>View statistics and analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                <Link href="/admin/commitment-stats">
                  <Button variant="outline" className="w-full justify-start hover:bg-red-50">
                    📊 Commitment Statistics
                  </Button>
                </Link>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
