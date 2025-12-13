"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { 
  Users, Trophy, Target, UserCheck, Clock, 
  School, Pencil, BarChart3, Settings, FileText,
  TrendingUp, Zap, Plus
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
      // CRITICAL: Check for rate limit cooldown BEFORE making API calls
      // This prevents API routes from calling getUser() during cooldown
      if (typeof window !== "undefined") {
        const rateLimitCookie = document.cookie
          .split("; ")
          .find((c) => c.startsWith("rate_limit_cooldown="))
        if (rateLimitCookie) {
          const cooldownValue = rateLimitCookie.split("=")[1]
          const cooldownTime = parseInt(cooldownValue, 10)
          if (cooldownTime && Date.now() < cooldownTime + 600000) {
            const remainingMinutes = Math.ceil((cooldownTime + 600000 - Date.now()) / 60000)
            console.warn(`[Admin] Rate limit cooldown active (${remainingMinutes} min remaining), skipping API calls`)
            setLoading(false)
            return // Don't make API calls during cooldown
          }
        }
      }

      try {
        const response = await fetch("/api/admin/stats/overview", {
          credentials: "include"
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else if (response.status === 429) {
          console.warn("[Admin] Rate limited on stats API")
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

        {/* Management Tools - Individual Tiles */}
        <div>
          <h2 className="text-2xl font-bold text-[#13294B] mb-4 flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#C8102E]" />
            Management Tools
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* View All Athletes */}
            <Link href="/admin/athletes">
              <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Users className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">View All Athletes</h3>
                  <p className="text-xs text-gray-600">Manage athlete profiles</p>
                </CardContent>
              </Card>
            </Link>

            {/* Add New Athlete */}
            <Link href="/admin/athletes/add">
              <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Plus className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Add New Athlete</h3>
                  <p className="text-xs text-gray-600">Create new profile</p>
                </CardContent>
              </Card>
            </Link>

            {/* Match Manager */}
            <Link href="/admin/match-manager">
              <Card className="border-t-4 border-t-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Trophy className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Match Manager</h3>
                  <p className="text-xs text-gray-600">Manage match records</p>
                </CardContent>
              </Card>
            </Link>

            {/* Submissions Manager */}
            <Link href="/admin/submissions-manager">
              <Card className="border-t-4 border-t-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <FileText className="h-10 w-10 text-[#C8102E] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Submissions Manager</h3>
                  <p className="text-xs text-gray-600">Review submissions</p>
                </CardContent>
              </Card>
            </Link>

            {/* Schools & Coaches */}
            <Link href="/admin/schools">
              <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <School className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Schools & Coaches</h3>
                  <p className="text-xs text-gray-600">Manage schools</p>
                </CardContent>
              </Card>
            </Link>

            {/* Prospect Rankings */}
            <Link href="/admin/prospects/simple-ranking">
              <Card className="border-t-4 border-t-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Trophy className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Prospect Rankings</h3>
                  <p className="text-xs text-gray-600">Manage rankings</p>
                </CardContent>
              </Card>
            </Link>

            {/* Users Dashboard */}
            <Link href="/admin/users-dashboard">
              <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <UserCheck className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Users Dashboard</h3>
                  <p className="text-xs text-gray-600">Manage users</p>
                </CardContent>
              </Card>
            </Link>

            {/* Enhanced Logo Manager */}
            <Link href="/admin/enhanced-logo-manager">
              <Card className="border-t-4 border-t-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Pencil className="h-10 w-10 text-[#13294B] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Enhanced Logo Manager</h3>
                  <p className="text-xs text-gray-600">Manage logos</p>
                </CardContent>
              </Card>
            </Link>

            {/* Commitment Statistics */}
            <Link href="/admin/commitment-stats">
              <Card className="border-t-4 border-t-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <BarChart3 className="h-10 w-10 text-[#C8102E] mb-3" />
                  <h3 className="font-bold text-[#13294B] mb-1">Commitment Statistics</h3>
                  <p className="text-xs text-gray-600">View analytics</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
