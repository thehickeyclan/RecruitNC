"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { HardLink } from "@/components/hard-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { 
  Users, Trophy, Target, UserCheck, Clock, Calendar,
  School, Pencil, BarChart3, Settings, FileText,
  TrendingUp, Zap, Plus, Eye, UserPlus, RefreshCw, ClipboardList, Database, BookOpen, CreditCard,
  ShoppingBag, Smile, Coins, LayoutDashboard, CircleDollarSign, Link2, Receipt, GraduationCap,
  LayoutGrid, Handshake, Mail, Bot, Scale, Newspaper,
} from "lucide-react"

interface AdminStats {
  totalAthletes: number
  totalProspects: number
  totalCommits: number
  totalUsers: number
  totalCoaches: number
  pendingSubmissions: number
  pendingDataDawgFeedback: number
}

const TOC_ADMIN_LINKS = [
  { href: "/admin/toc", title: "TOC hub", description: "Overview of all TOC admin tools", icon: Trophy },
  { href: "/admin/toc/invitations", title: "Invitations", description: "Send invites · copy confirm links", icon: UserCheck },
  { href: "/admin/toc/field", title: "Field & brackets", description: "Seed wrestlers · publish official draws", icon: LayoutGrid },
  { href: "/admin/toc/compare", title: "Athlete compare", description: "H2H · state · NHSCA · Duals · Super32", icon: Scale },
  { href: "/admin/toc/nominations", title: "Prospect interest", description: "Athlete interest form submissions", icon: Users },
  { href: "/admin/toc/sponsors", title: "Sponsors", description: "Sponsor inquiry pipeline", icon: Handshake },
  { href: "/admin/toc/media", title: "Media requests", description: "Credentials & coverage pipeline", icon: Newspaper },
  { href: "/admin/toc/email", title: "Email list", description: "Subscribers · CSV export", icon: Mail },
  { href: "/tournament-of-champions/brackets", title: "Brackets preview", description: "Admin-only draws until published", icon: LayoutGrid },
  { href: "/tournament-of-champions", title: "Public landing", description: "Marketing event page", icon: Eye },
] as const

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalAthletes: 0,
    totalProspects: 0,
    totalCommits: 0,
    totalUsers: 0,
    totalCoaches: 0,
    pendingSubmissions: 0,
    pendingDataDawgFeedback: 0,
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
          // Cooldown is 2 minutes (120000ms) - reduced from 10 minutes
          if (cooldownTime && Date.now() < cooldownTime + 120000) {
            const remainingSeconds = Math.ceil((cooldownTime + 120000 - Date.now()) / 1000)
            const remainingMinutes = Math.ceil(remainingSeconds / 60)
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
      <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white shadow-lg">
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
              <Button className="bg-white text-[#003366] hover:bg-gray-100">
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
          <h2 className="text-2xl font-bold text-[#003366] mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#C8102E]" />
            Key Platform Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Platform Users */}
            <Card className="border-l-4 border-l-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center">
                  <Users className="h-8 w-8 text-[#003366] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Platform Users</p>
                  <p className="text-3xl font-bold text-[#003366]">{loading ? "..." : stats.totalUsers}</p>
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
            <Card className="border-l-4 border-l-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center">
                  <Users className="h-8 w-8 text-[#003366] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Athletes</p>
                  <p className="text-3xl font-bold text-[#003366]">{loading ? "..." : stats.totalAthletes}</p>
                </div>
              </CardContent>
            </Card>

            {/* Commits */}
            <Card className="border-l-4 border-l-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-yellow-50">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-[#003366] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Commits</p>
                  <p className="text-3xl font-bold text-[#003366]">{loading ? "..." : stats.totalCommits}</p>
                </div>
              </CardContent>
            </Card>

            {/* Prospects */}
            <Card className="border-l-4 border-l-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <CardContent className="p-5 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center">
                  <Target className="h-8 w-8 text-[#003366] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Prospects</p>
                  <p className="text-3xl font-bold text-[#003366]">{loading ? "..." : stats.totalProspects}</p>
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
          <h2 className="text-2xl font-bold text-[#003366] mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6 text-[#C8102E]" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <HardLink href="/admin/dashboard" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#0c4a6e] to-[#075985] hover:from-[#075985] hover:to-[#0c4a6e] text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <LayoutDashboard className="h-6 w-6" />
                <span className="text-sm font-semibold">Executive Dashboard</span>
              </span>
            </HardLink>
            <HardLink href="/admin/revenue" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-emerald-800 to-emerald-950 hover:from-emerald-900 hover:to-emerald-800 text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <CircleDollarSign className="h-6 w-6" />
                <span className="text-sm font-semibold">Revenue</span>
              </span>
            </HardLink>
            <HardLink href="/admin/data-dawg/analytics" className="block">
              <span className="relative w-full h-20 bg-gradient-to-br from-[#13294B] to-[#0A1628] hover:from-[#1e3a5f] hover:to-[#13294B] text-[#D3B574] shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold border border-[#D3B574]/30">
                {!loading && stats.pendingDataDawgFeedback > 0 ? (
                  <span className="absolute top-2 right-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-[#C8102E] text-white text-[10px] font-bold flex items-center justify-center">
                    {stats.pendingDataDawgFeedback}
                  </span>
                ) : null}
                <Bot className="h-6 w-6" />
                <span className="text-sm font-semibold">Data Dawg</span>
              </span>
            </HardLink>
            <Link href="/admin/athletes">
              <Button className="w-full h-20 bg-gradient-to-br from-[#003366] to-[#004080] hover:from-[#004080] hover:to-[#003366] text-white shadow-lg flex flex-col items-center justify-center gap-2">
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
            <Link href="/admin/new-profile-additions">
              <Button className="w-full h-20 bg-gradient-to-br from-[#003366] to-[#004080] hover:from-[#004080] hover:to-[#003366] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <UserPlus className="h-6 w-6" />
                <span className="text-sm font-semibold">New Additions</span>
              </Button>
            </Link>
            <Link href="/admin/profile-inventory">
              <Button className="w-full h-20 bg-gradient-to-br from-[#003366] to-[#004080] hover:from-[#004080] hover:to-[#003366] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <ClipboardList className="h-6 w-6" />
                <span className="text-sm font-semibold">Profile Inventory</span>
              </Button>
            </Link>
            <Link href="/admin/schools">
              <Button className="w-full h-20 bg-gradient-to-br from-[#003366] to-[#004080] hover:from-[#004080] hover:to-[#003366] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <School className="h-6 w-6" />
                <span className="text-sm font-semibold">Schools</span>
              </Button>
            </Link>
            <Link href="/admin/match-manager">
              <Button className="w-full h-20 bg-gradient-to-br from-[#FFC72C] to-[#e6b328] hover:from-[#e6b328] hover:to-[#FFC72C] text-[#003366] shadow-lg flex flex-col items-center justify-center gap-2 font-bold">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-semibold">Match Manager</span>
              </Button>
            </Link>
            <Link href="/admin/nhsca-analytics">
              <Button className="w-full h-20 bg-gradient-to-br from-[#D3B574] to-[#b89a5a] hover:from-[#b89a5a] hover:to-[#D3B574] text-[#003366] shadow-lg flex flex-col items-center justify-center gap-2 font-bold">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-semibold">NHSCA Analytics</span>
              </Button>
            </Link>
            <HardLink href="/admin/national-team" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#D3B574] to-[#b89a5a] hover:from-[#b89a5a] hover:to-[#D3B574] text-[#003366] shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-semibold">National team</span>
              </span>
            </HardLink>
            <HardLink href="/admin/fundraising" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#7c2d12] to-[#991b1b] hover:from-[#991b1b] hover:to-[#7c2d12] text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <Coins className="h-6 w-6" />
                <span className="text-sm font-semibold">Fundraising</span>
              </span>
            </HardLink>
            <HardLink href="/admin/fundraising-ledger" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#422006] to-[#713f12] hover:from-[#713f12] hover:to-[#422006] text-[#fde68a] shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold border border-amber-700/40">
                <ClipboardList className="h-6 w-6" />
                <span className="text-sm font-semibold">Fundraising ledger</span>
              </span>
            </HardLink>
            <HardLink href="/admin/scholarships" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#13294b] to-[#0B2545] hover:from-[#0B2545] hover:to-[#13294b] text-[#C8A94A] shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold border border-[#C8A94A]/30">
                <GraduationCap className="h-6 w-6" />
                <span className="text-sm font-semibold">Scholarships</span>
              </span>
            </HardLink>
            <HardLink href="/admin/expense-requests" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] hover:from-[#0f2744] hover:to-[#1e3a5f] text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <Receipt className="h-6 w-6" />
                <span className="text-sm font-semibold">Reimbursements</span>
              </span>
            </HardLink>
            <HardLink href="/admin/guild-parent-link" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#0f5132] to-[#14532d] hover:from-[#14532d] hover:to-[#0f5132] text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <Link2 className="h-6 w-6" />
                <span className="text-sm font-semibold">Guild parent link</span>
              </span>
            </HardLink>
            <Link href="/admin/blue">
              <Button className="w-full h-20 bg-gradient-to-br from-[#003366] to-[#0a2571] hover:from-[#0a2571] hover:to-[#003366] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <CreditCard className="h-6 w-6" />
                <span className="text-sm font-semibold">Blue Program</span>
              </Button>
            </Link>
            <HardLink href="/admin/calendar" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] hover:from-[#1e3a5f] hover:to-[#0f172a] text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex font-bold">
                <Calendar className="h-6 w-6" />
                <span className="text-sm font-semibold">NC United Calendar</span>
              </span>
            </HardLink>
            <HardLink href="/admin/store" className="block">
              <span className="w-full h-20 bg-gradient-to-br from-[#1a5f4a] to-[#145239] hover:from-[#145239] hover:to-[#1a5f4a] text-white shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer rounded-md inline-flex">
                <ShoppingBag className="h-6 w-6" />
                <span className="text-sm font-semibold">Store</span>
              </span>
            </HardLink>
            <Link href="/admin/college-recruiting-guide">
              <Button className="w-full h-20 bg-gradient-to-br from-[#1a5f4a] to-[#145239] hover:from-[#145239] hover:to-[#1a5f4a] text-white shadow-lg flex flex-col items-center justify-center gap-2">
                <BookOpen className="h-6 w-6" />
                <span className="text-sm font-semibold">College Recruiting Guide</span>
              </Button>
            </Link>
            <Link href="/admin/super32-tools">
              <Button className="w-full h-20 bg-gradient-to-br from-[#1a5f4a] to-[#145239] hover:from-[#145239] hover:to-[#1a5f4a] text-white shadow-lg flex flex-col items-center justify-center gap-2 font-bold">
                <RefreshCw className="h-6 w-6" />
                <span className="text-sm font-semibold">Super32 Tools</span>
              </Button>
            </Link>
            <Link href="/admin/users-dashboard">
              <Button className="w-full min-h-20 h-auto py-3 bg-gradient-to-br from-[#003366] to-[#004080] hover:from-[#004080] hover:to-[#003366] text-white shadow-lg flex flex-col items-center justify-center gap-1 px-2">
                <UserCheck className="h-6 w-6 shrink-0" />
                <span className="text-sm font-semibold">Users</span>
                <span className="text-[10px] font-normal leading-tight opacity-90">Marketing email copy</span>
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

        {/* Tournament of Champions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#003366] mb-4 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-[#CC0000]" />
            Tournament of Champions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {TOC_ADMIN_LINKS.map(({ href, title, description, icon: Icon }) => (
              <HardLink key={href} href={href} className="block h-full">
                <Card className="border-t-4 border-t-[#CC0000] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <Icon className="h-10 w-10 text-[#0B1D3A] mb-3" />
                    <h3 className="font-bold text-[#003366] mb-1">{title}</h3>
                    <p className="text-xs text-gray-600">{description}</p>
                  </CardContent>
                </Card>
              </HardLink>
            ))}
          </div>
        </div>

        {/* Management Tools - Individual Tiles */}
        <div>
          <h2 className="text-2xl font-bold text-[#003366] mb-4 flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#C8102E]" />
            Management Tools
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* View All Athletes */}
            <Link href="/admin/athletes">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Users className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">View All Athletes</h3>
                  <p className="text-xs text-gray-600">Manage athlete profiles</p>
                </CardContent>
              </Card>
            </Link>

            {/* Add New Athlete */}
            <Link href="/admin/athletes/add">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Plus className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Add New Athlete</h3>
                  <p className="text-xs text-gray-600">Create new profile</p>
                </CardContent>
              </Card>
            </Link>

            {/* Profile Inventory */}
            <Link href="/admin/profile-inventory">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <ClipboardList className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Profile Inventory</h3>
                  <p className="text-xs text-gray-600">User-created & pending submissions</p>
                </CardContent>
              </Card>
            </Link>

            {/* Match Manager */}
            <Link href="/admin/match-manager">
              <Card className="border-t-4 border-t-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Trophy className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Match Manager</h3>
                  <p className="text-xs text-gray-600">Manage match records</p>
                </CardContent>
              </Card>
            </Link>

            {/* Data Dawg analytics + feedback */}
            <HardLink href="/admin/data-dawg/analytics" className="block h-full">
              <Card className="border-t-4 border-t-[#D3B574] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full relative">
                {!loading && stats.pendingDataDawgFeedback > 0 ? (
                  <span className="absolute top-3 right-3 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-[#C8102E] text-white text-xs font-bold flex items-center justify-center">
                    {stats.pendingDataDawgFeedback}
                  </span>
                ) : null}
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Bot className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Data Dawg Analytics</h3>
                  <p className="text-xs text-gray-600">Query log, success rates & feedback</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* Submissions Manager */}
            <Link href="/admin/submissions-manager">
              <Card className="border-t-4 border-t-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <FileText className="h-10 w-10 text-[#C8102E] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Submissions Manager</h3>
                  <p className="text-xs text-gray-600">Review submissions</p>
                </CardContent>
              </Card>
            </Link>

            {/* National team — interest forms + event payments (e.g. NHSCA 2026) */}
            <HardLink href="/admin/national-team" className="block h-full">
              <Card className="border-t-4 border-t-[#D3B574] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Trophy className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">National team</h3>
                  <p className="text-xs text-gray-600">Interest forms and event payments</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* Blue Program — hub for subscriptions, invites, reports, promo codes, images, interest */}
            <Link href="/admin/blue">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <CreditCard className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Blue Program</h3>
                  <p className="text-xs text-gray-600">Memberships, invites, reports, images, interest</p>
                </CardContent>
              </Card>
            </Link>

            {/* NC United Calendar — events CRUD, public /calendar. HardLink for reliable admin nav. */}
            <HardLink href="/admin/calendar" className="block h-full">
              <Card className="border-t-4 border-t-[#0f172a] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Calendar className="h-10 w-10 text-[#0f172a] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">NC United Calendar</h3>
                  <p className="text-xs text-gray-600">Events, practices, camps, drop-in settings</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* Store — orders, products, promo codes. HardLink so click navigates. */}
            <HardLink href="/admin/store" className="block h-full">
              <Card className="border-t-4 border-t-[#1a5f4a] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <ShoppingBag className="h-10 w-10 text-[#1a5f4a] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Store</h3>
                  <p className="text-xs text-gray-600">Orders, products, promo codes</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* College Recruiting Guide */}
            <Link href="/admin/college-recruiting-guide">
              <Card className="border-t-4 border-t-[#1a5f4a] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <BookOpen className="h-10 w-10 text-[#1a5f4a] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">College Recruiting Guide</h3>
                  <p className="text-xs text-gray-600">Printable guide for coaches (2026–2028)</p>
                </CardContent>
              </Card>
            </Link>

            {/* Super32 Tools — HardLink for reliable admin nav */}
            <HardLink href="/admin/super32-tools" className="block h-full">
              <Card className="border-t-4 border-t-[#1a5f4a] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <RefreshCw className="h-10 w-10 text-[#1a5f4a] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Super32 Tools</h3>
                  <p className="text-xs text-gray-600">Reconcile DB to verified CSV</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* NCHSAA — brackets, state results utilities */}
            <Link href="/admin/nchsaa">
              <Card className="border-t-4 border-t-[#B91C1C] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Trophy className="h-10 w-10 text-[#B91C1C] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">NCHSAA</h3>
                  <p className="text-xs text-gray-600">Bracket upload, state results</p>
                </CardContent>
              </Card>
            </Link>

            {/* Schools & Coaches */}
            <Link href="/admin/schools">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <School className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Schools & Coaches</h3>
                  <p className="text-xs text-gray-600">Manage schools</p>
                </CardContent>
              </Card>
            </Link>

            {/* Prospect Rankings */}
            <Link href="/admin/prospects/simple-ranking">
              <Card className="border-t-4 border-t-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Trophy className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Prospect Rankings</h3>
                  <p className="text-xs text-gray-600">Manage rankings</p>
                </CardContent>
              </Card>
            </Link>

            <HardLink href="/admin/crm" className="block h-full">
              <Card className="border-t-4 border-t-[#D3B574] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <LayoutDashboard className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">User CRM</h3>
                  <p className="text-xs text-gray-600">Command center · filter users · open contact workspace</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* Users Dashboard */}
            <Link href="/admin/users-dashboard">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <UserCheck className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Users Dashboard</h3>
                  <p className="text-xs text-gray-600">Manage users · copy all emails for marketing</p>
                </CardContent>
              </Card>
            </Link>

            {/* Custom emoji — HS, College, Club, NCU logos for messaging */}
            <HardLink href="/admin/custom-emoji" className="block h-full">
              <Card className="border-t-4 border-t-[#D3B574] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Smile className="h-10 w-10 text-[#D3B574] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Custom emoji</h3>
                  <p className="text-xs text-gray-600">HS, College, Club, NCU logos for messages</p>
                </CardContent>
              </Card>
            </HardLink>

            {/* Enhanced Logo Manager */}
            <Link href="/admin/enhanced-logo-manager">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Pencil className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Enhanced Logo Manager</h3>
                  <p className="text-xs text-gray-600">Manage logos</p>
                </CardContent>
              </Card>
            </Link>

            {/* Colleges (divisions) — colleges table used by app */}
            <Link href="/admin/colleges">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <School className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Colleges (divisions)</h3>
                  <p className="text-xs text-gray-600">Set division per college</p>
                </CardContent>
              </Card>
            </Link>

            {/* College division mappings (legacy) */}
            <Link href="/admin/setup-college-mappings">
              <Card className="border-t-4 border-t-[#003366] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Database className="h-10 w-10 text-[#003366] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">College division mappings</h3>
                  <p className="text-xs text-gray-600">Seed division lookup table</p>
                </CardContent>
              </Card>
            </Link>

            {/* Commitment Statistics */}
            <Link href="/admin/commitment-stats">
              <Card className="border-t-4 border-t-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <BarChart3 className="h-10 w-10 text-[#C8102E] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Commitment Statistics</h3>
                  <p className="text-xs text-gray-600">View analytics</p>
                </CardContent>
              </Card>
            </Link>

            {/* Profile View Analytics */}
            <Link href="/admin/card-analytics">
              <Card className="border-t-4 border-t-[#D3B574] shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <Eye className="h-10 w-10 text-[#D3B574] mb-3" />
                  <h3 className="font-bold text-[#003366] mb-1">Profile View Analytics</h3>
                  <p className="text-xs text-gray-600">Most viewed profiles · everyone vs coaches</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
