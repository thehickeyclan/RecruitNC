"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, TrendingUp } from "lucide-react"

export default function CommitmentStatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (yearFilter !== "all") params.append("year", yearFilter)
      if (genderFilter !== "all") params.append("gender", genderFilter)
      
      const response = await fetch(`/api/direct-dashboard-stats?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [yearFilter, genderFilter])

  return (
    <div className="container mx-auto py-8 px-4">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#13294B] to-[#1a3a5c] rounded-lg shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-8 w-8 text-[#C8102E]" />
              <h1 className="text-4xl font-bold text-white">Commitment Statistics</h1>
            </div>
            <p className="text-blue-200 text-lg">Track NC Wrestling commitments across all divisions</p>
          </div>
          <Button 
            onClick={fetchStats} 
            disabled={loading} 
            className="bg-[#C8102E] hover:bg-[#a00d25] text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-l-4 border-[#13294B]">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
          <CardTitle className="text-[#13294B] flex items-center gap-2">
            <span className="text-xl">📊</span> Filter Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="border-gray-300 focus:border-[#13294B] focus:ring-[#13294B]">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2025">Class of 2025</SelectItem>
                  <SelectItem value="2026">Class of 2026</SelectItem>
                  <SelectItem value="2027">Class of 2027</SelectItem>
                  <SelectItem value="2028">Class of 2028</SelectItem>
                  <SelectItem value="2029">Class of 2029</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="border-gray-300 focus:border-[#13294B] focus:ring-[#13294B]">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded mb-6 shadow">
          <p className="font-medium">Error loading statistics</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && !stats && (
        <div className="text-center py-20">
          <RefreshCw className="h-12 w-12 animate-spin text-[#13294B] mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading commitment statistics...</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Commitments Card */}
          <Card className="border-l-4 border-[#13294B] shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#1a3a5c]">
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">🎯</span> Total Commitments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-6xl font-bold text-[#13294B] mb-2">{stats.totalCommitments}</p>
              <p className="text-gray-600">Athletes committed to college programs</p>
            </CardContent>
          </Card>

          {/* Class Breakdown Card */}
          <Card className="border-l-4 border-[#C8102E] shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#C8102E] to-[#a00d25]">
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">📅</span> Class Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Class of 2025</p>
                  <p className="text-4xl font-bold text-[#13294B]">{stats.classOf2025}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Class of 2026</p>
                  <p className="text-4xl font-bold text-[#C8102E]">{stats.classOf2026}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Division Breakdown Card */}
          <Card className="md:col-span-2 border-l-4 border-[#FFC72C] shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#FFC72C] to-[#e6b328]">
              <CardTitle className="text-[#13294B] flex items-center gap-2">
                <span className="text-2xl">🏆</span> Division Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-[#13294B] to-[#1a3a5c] p-6 rounded-lg text-center shadow-md hover:scale-105 transition-transform">
                  <p className="text-white text-sm font-medium mb-2">NCAA D1</p>
                  <p className="text-5xl font-bold text-white">{stats.divisionBreakdown?.D1 || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg text-center shadow-md hover:scale-105 transition-transform">
                  <p className="text-white text-sm font-medium mb-2">NCAA D2</p>
                  <p className="text-5xl font-bold text-white">{stats.divisionBreakdown?.D2 || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-[#C8102E] to-[#a00d25] p-6 rounded-lg text-center shadow-md hover:scale-105 transition-transform">
                  <p className="text-white text-sm font-medium mb-2">NCAA D3</p>
                  <p className="text-5xl font-bold text-white">{stats.divisionBreakdown?.D3 || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-[#FFC72C] to-[#e6b328] p-6 rounded-lg text-center shadow-md hover:scale-105 transition-transform">
                  <p className="text-[#13294B] text-sm font-medium mb-2">NAIA</p>
                  <p className="text-5xl font-bold text-[#13294B]">{stats.divisionBreakdown?.NAIA || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-600 to-gray-700 p-6 rounded-lg text-center shadow-md hover:scale-105 transition-transform">
                  <p className="text-white text-sm font-medium mb-2">NJCAA</p>
                  <p className="text-5xl font-bold text-white">{stats.divisionBreakdown?.NJCAA || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
