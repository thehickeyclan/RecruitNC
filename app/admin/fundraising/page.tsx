"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import {
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  CheckCircle,
  Clock,
  ArrowRight,
  Gift,
  Trophy,
  FileText,
  Wallet,
  Download,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  totalRaised: number
  totalSpent: number
  totalAvailable: number
  totalDonations: number
  pendingActivations: number
  pendingReimbursements: number
  activeCampaigns: number
  activeAthletePages: number
}

interface RecentDonation {
  id: string
  amount: number
  donor_name: string
  athlete_name: string | null
  campaign_name: string | null
  type: "spartan" | "campaign"
  created_at: string
}

export default function FundraisingDashboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (user && isAdmin) {
      fetchDashboardData()
    }
  }, [user, isAdmin])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError("")
    try {
      const [statsRes, donationsRes] = await Promise.all([
        fetch("/api/admin/fundraising/dashboard-stats"),
        fetch("/api/admin/fundraising/recent-donations?limit=10"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (donationsRes.ok) {
        const donationsData = await donationsRes.json()
        setRecentDonations(donationsData.donations || [])
      }
    } catch {
      setError("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  const quickActions = [
    {
      label: "Recent Donations",
      description: "View last 100 donations",
      href: "/admin/fundraising/donations",
      icon: Gift,
      color: "text-green-400",
    },
    {
      label: "Leaderboard",
      description: "Top fundraisers",
      href: "/admin/fundraising/leaderboard",
      icon: Trophy,
      color: "text-[#D3B574]",
    },
    {
      label: "Activations",
      description: "Pending requests",
      href: "/admin/fundraising/activations",
      icon: CheckCircle,
      color: "text-blue-400",
      badge: stats?.pendingActivations,
    },
    {
      label: "Reimbursements",
      description: "Review receipts",
      href: "/admin/reimbursements",
      icon: Receipt,
      color: "text-orange-400",
      badge: stats?.pendingReimbursements,
    },
    {
      label: "Wallets",
      description: "Family balances",
      href: "/admin/fundraising/wallets",
      icon: Wallet,
      color: "text-purple-400",
    },
    {
      label: "Audit Ledger",
      description: "Full transaction log",
      href: "/admin/fundraising/ledger",
      icon: FileText,
      color: "text-gray-400",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Admin</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Fundraising</h1>
              <p className="text-gray-400 text-sm mt-1">Manage donations, wallets, and reimbursements</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
                onClick={() => router.push("/admin/fundraising/ledger?export=true")}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Audit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-3 text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Total Raised</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-green-400">
                      {formatCurrency(stats?.totalRaised || 0)}
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Total Spent</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-orange-400">
                      {formatCurrency(stats?.totalSpent || 0)}
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Available</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-[#D3B574]">
                      {formatCurrency(stats?.totalAvailable || 0)}
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#D3B574]/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-[#D3B574]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Donations</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {stats?.totalDonations?.toLocaleString() || 0}
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="relative p-4 bg-[#0F1E32] border border-[#1e3a5f] rounded-xl hover:bg-[#1e3a5f] hover:border-[#D3B574]/50 transition-all text-left group"
                >
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
                  <Icon className={`h-6 w-6 ${action.color} mb-2`} />
                  <p className="font-medium text-white text-sm">{action.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Donations */}
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">Recent Donations</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/fundraising/donations")}
                  className="text-[#D3B574] hover:text-white hover:bg-[#1e3a5f]"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-[#1e3a5f]" />
                  ))}
                </div>
              ) : recentDonations.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No recent donations</p>
              ) : (
                <div className="space-y-2">
                  {recentDonations.slice(0, 5).map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0A1628] border border-[#1e3a5f]/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {donation.donor_name || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {donation.type === "spartan"
                            ? donation.athlete_name || "Spartan"
                            : donation.campaign_name || "Campaign"}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-semibold text-green-400">
                          {formatCurrency(donation.amount)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(donation.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Items */}
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <button
                onClick={() => router.push("/admin/fundraising/activations")}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-[#0A1628] border border-[#1e3a5f]/50 hover:border-[#D3B574]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Activation Requests</p>
                    <p className="text-xs text-gray-500">Athlete page approvals</p>
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-8 rounded-full bg-[#1e3a5f]" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm flex items-center justify-center">
                    {stats?.pendingActivations || 0}
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push("/admin/reimbursements")}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-[#0A1628] border border-[#1e3a5f]/50 hover:border-[#D3B574]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Reimbursements</p>
                    <p className="text-xs text-gray-500">Pending receipt reviews</p>
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-8 rounded-full bg-[#1e3a5f]" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm flex items-center justify-center">
                    {stats?.pendingReimbursements || 0}
                  </span>
                )}
              </button>

              <div className="pt-4 border-t border-[#1e3a5f]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Active Campaigns</span>
                  {isLoading ? (
                    <Skeleton className="h-5 w-8 bg-[#1e3a5f]" />
                  ) : (
                    <span className="text-white font-medium">{stats?.activeCampaigns || 0}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-400">Active Athlete Pages</span>
                  {isLoading ? (
                    <Skeleton className="h-5 w-8 bg-[#1e3a5f]" />
                  ) : (
                    <span className="text-white font-medium">{stats?.activeAthletePages || 0}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign vs Spartan Quick Toggle */}
        <Card className="bg-[#0F1E32] border-[#1e3a5f] mt-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-medium text-white">View by Type</h3>
                <p className="text-sm text-gray-500">Filter donations by fundraising type</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/fundraising/donations?type=spartan")}
                  className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f] hover:text-white"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Spartan (Athletes)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/fundraising/donations?type=campaign")}
                  className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f] hover:text-white"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Campaigns
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
