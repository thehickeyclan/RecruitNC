"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  Search,
  Gift,
  Users,
  DollarSign,
  Filter,
  Download,
  AlertCircle,
} from "lucide-react"

interface Donation {
  id: string
  amount_cents: number
  donor_name: string | null
  donor_email: string | null
  athlete_code: string | null
  athlete_display_name: string | null
  campaign_name: string | null
  type: "spartan" | "campaign"
  created_at: string
}

export default function AdminDonationsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")

  const [donations, setDonations] = useState<Donation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "spartan" | "campaign">(
    typeParam === "spartan" || typeParam === "campaign" ? typeParam : "all"
  )
  const [limit, setLimit] = useState(100)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const loadDonations = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.set("limit", limit.toString())
      if (typeFilter !== "all") {
        params.set("type", typeFilter)
      }

      const res = await fetch(`/api/admin/fundraising/donations?${params}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setDonations(data.donations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donations")
    } finally {
      setIsLoading(false)
    }
  }, [typeFilter, limit])

  useEffect(() => {
    if (user && isAdmin) {
      loadDonations()
    }
  }, [user, isAdmin, loadDonations])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const filteredDonations = donations.filter((d) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (d.donor_name?.toLowerCase().includes(q)) ||
      (d.donor_email?.toLowerCase().includes(q)) ||
      (d.athlete_code?.toLowerCase().includes(q)) ||
      (d.athlete_display_name?.toLowerCase().includes(q)) ||
      (d.campaign_name?.toLowerCase().includes(q))
    )
  })

  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount_cents, 0)

  const exportCsv = () => {
    const headers = ["Date", "Donor", "Email", "Amount", "Type", "Athlete/Campaign"]
    const rows = filteredDonations.map((d) => [
      new Date(d.created_at).toISOString(),
      d.donor_name || "Anonymous",
      d.donor_email || "",
      (d.amount_cents / 100).toFixed(2),
      d.type,
      d.type === "spartan" ? d.athlete_display_name || d.athlete_code || "" : d.campaign_name || "",
    ])
    
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`
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
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Recent Donations</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDonations}
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
                Export CSV
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

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Showing</p>
              <p className="text-xl font-bold text-white">{filteredDonations.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalAmount)}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Spartan (Athletes)</p>
              <p className="text-xl font-bold text-blue-400">
                {filteredDonations.filter((d) => d.type === "spartan").length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Campaigns</p>
              <p className="text-xl font-bold text-purple-400">
                {filteredDonations.filter((d) => d.type === "campaign").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search donor, email, athlete, or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0F1E32] border-[#1e3a5f] text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "spartan" | "campaign")}>
            <SelectTrigger className="w-full sm:w-48 bg-[#0F1E32] border-[#1e3a5f] text-white">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
              <SelectItem value="all" className="text-white">All Types</SelectItem>
              <SelectItem value="spartan" className="text-white">Spartan (Athletes)</SelectItem>
              <SelectItem value="campaign" className="text-white">Campaigns</SelectItem>
            </SelectContent>
          </Select>
          <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
            <SelectTrigger className="w-full sm:w-32 bg-[#0F1E32] border-[#1e3a5f] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
              <SelectItem value="50" className="text-white">Last 50</SelectItem>
              <SelectItem value="100" className="text-white">Last 100</SelectItem>
              <SelectItem value="250" className="text-white">Last 250</SelectItem>
              <SelectItem value="500" className="text-white">Last 500</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Donations List */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-[#1e3a5f]" />
            ))
          ) : filteredDonations.length === 0 ? (
            <Card className="bg-[#0F1E32] border-[#1e3a5f]">
              <CardContent className="p-8 text-center">
                <Gift className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No donations found</p>
              </CardContent>
            </Card>
          ) : (
            filteredDonations.map((donation) => (
              <Card key={donation.id} className="bg-[#0F1E32] border-[#1e3a5f]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      donation.type === "spartan" ? "bg-blue-500/20" : "bg-purple-500/20"
                    }`}>
                      {donation.type === "spartan" ? (
                        <Users className="h-5 w-5 text-blue-400" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-white truncate">
                          {donation.donor_name || "Anonymous"}
                        </p>
                        <Badge
                          className={`text-xs ${
                            donation.type === "spartan"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          }`}
                        >
                          {donation.type === "spartan" ? "Athlete" : "Campaign"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {donation.type === "spartan"
                          ? donation.athlete_display_name || donation.athlete_code || "General Fund"
                          : donation.campaign_name || "Campaign"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(donation.created_at)}
                        {donation.donor_email && (
                          <span className="ml-2">&middot; {donation.donor_email}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-400">
                        {formatCurrency(donation.amount_cents)}
                      </p>
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
