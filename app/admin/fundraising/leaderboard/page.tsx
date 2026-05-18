"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  Search,
  Download,
  TrendingUp,
  Wallet,
  Receipt,
  AlertCircle,
} from "lucide-react"
import {
  FUNDRAISING_CAMPAIGNS,
  DEFAULT_FUNDRAISING_CAMPAIGN,
} from "@/lib/fundraising/campaign-registry"

interface AthleteRanking {
  athleteCode: string
  athleteDisplayName: string | null
  totalCents: number
  donationCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  netAfterReimbursementsCents: number
  guildAllocationsCents: number
  remainingCents: number
}

export default function AdminLeaderboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [campaignSlug, setCampaignSlug] = useState(DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug)
  const [days, setDays] = useState(DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays)
  const [rankings, setRankings] = useState<AthleteRanking[]>([])
  const [totals, setTotals] = useState<{
    grossCents: number
    reimbursedCents: number
    netCents: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const loadRankings = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch(
        `/api/admin/spartan-donations?days=${days}&campaign=${encodeURIComponent(campaignSlug)}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")

      const athletes = (data.byAthlete || []).map((a: AthleteRanking) => ({
        ...a,
        remainingCents: (a.totalCents || 0) - (a.reimbursementsPaidCents || 0) - (a.guildAllocationsCents || 0),
      }))

      setRankings(athletes)
      setTotals({
        grossCents: data.grossSessionTotalCents || 0,
        reimbursedCents: data.reimbursementsPaidTotalCents || 0,
        netCents: data.netAfterReimbursementsCents || 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }, [campaignSlug, days])

  useEffect(() => {
    if (user && isAdmin) {
      loadRankings()
    }
  }, [user, isAdmin, loadRankings])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const filteredRankings = useMemo(() => {
    const sorted = [...rankings].sort((a, b) => b.totalCents - a.totalCents)
    if (!searchQuery) return sorted
    const q = searchQuery.toLowerCase()
    return sorted.filter(
      (r) =>
        r.athleteDisplayName?.toLowerCase().includes(q) ||
        r.athleteCode.toLowerCase().includes(q)
    )
  }, [rankings, searchQuery])

  const exportCsv = () => {
    const headers = ["Rank", "Athlete", "Code", "Raised", "Spent", "Remaining", "Donations"]
    const rows = filteredRankings.map((r, i) => [
      i + 1,
      r.athleteDisplayName || r.athleteCode,
      r.athleteCode,
      (r.totalCents / 100).toFixed(2),
      ((r.reimbursementsPaidCents + r.guildAllocationsCents) / 100).toFixed(2),
      (r.remainingCents / 100).toFixed(2),
      r.donationCount,
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  const dayPresets = [30, 90, 120, 365]

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/fundraising")}
                className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Admin</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Leaderboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRankings}
                disabled={isLoading}
                className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={exportCsv}
                className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
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

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Raised</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-lg font-bold text-green-400">{formatCurrency(totals?.grossCents || 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Spent</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-lg font-bold text-orange-400">{formatCurrency(totals?.reimbursedCents || 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#D3B574]/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-[#D3B574]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Net Available</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-lg font-bold text-[#D3B574]">{formatCurrency(totals?.netCents || 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search athlete..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0F1E32] border-[#1e3a5f] text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={campaignSlug} onValueChange={setCampaignSlug}>
            <SelectTrigger className="w-full sm:w-48 bg-[#0F1E32] border-[#1e3a5f] text-white">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
              {FUNDRAISING_CAMPAIGNS.map((c) => (
                <SelectItem key={c.stripeCampaignSlug} value={c.stripeCampaignSlug} className="text-white">
                  {c.tabLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {dayPresets.map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
                className={
                  days === d
                    ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
                    : "border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
                }
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>

        {/* Rankings List */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-[#1e3a5f]" />
            ))
          ) : filteredRankings.length === 0 ? (
            <Card className="bg-[#0F1E32] border-[#1e3a5f]">
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No athletes found</p>
              </CardContent>
            </Card>
          ) : (
            filteredRankings.map((athlete, index) => (
              <Card key={athlete.athleteCode} className="bg-[#0F1E32] border-[#1e3a5f]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      index === 0 ? "bg-[#D3B574]/30" :
                      index === 1 ? "bg-gray-400/20" :
                      index === 2 ? "bg-orange-700/20" :
                      "bg-[#1e3a5f]"
                    }`}>
                      {index < 3 ? (
                        <Trophy className={`h-5 w-5 ${
                          index === 0 ? "text-[#D3B574]" :
                          index === 1 ? "text-gray-300" :
                          "text-orange-600"
                        }`} />
                      ) : (
                        <span className="text-gray-400 font-bold text-sm">{index + 1}</span>
                      )}
                    </div>

                    {/* Athlete Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {athlete.athleteDisplayName || athlete.athleteCode}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{athlete.athleteCode}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:grid sm:grid-cols-3 gap-6 text-right">
                      <div>
                        <p className="text-xs text-gray-500">Raised</p>
                        <p className="font-semibold text-green-400">{formatCurrency(athlete.totalCents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Spent</p>
                        <p className="font-semibold text-orange-400">
                          {formatCurrency(athlete.reimbursementsPaidCents + athlete.guildAllocationsCents)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="font-semibold text-[#D3B574]">{formatCurrency(athlete.remainingCents)}</p>
                      </div>
                    </div>

                    {/* Mobile Stats */}
                    <div className="sm:hidden text-right">
                      <p className="font-bold text-green-400">{formatCurrency(athlete.totalCents)}</p>
                      <p className="text-xs text-gray-500">{athlete.donationCount} donations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
