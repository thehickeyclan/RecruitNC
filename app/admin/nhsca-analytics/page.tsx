"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface YearStats {
  year: number
  participants: number
  placers: number
  wins: number
  losses: number
  winPercentage: number
  placementBreakdown: Record<number, number>
}

interface ClassStats {
  class: number
  participants: number
  placers: number
  wins: number
  losses: number
  winPercentage: number
}

interface AnalyticsData {
  byYear: YearStats[]
  byClass: ClassStats[]
  bestYears: YearStats[]
  overall: {
    totalParticipants: number
    totalPlacers: number
    totalWins: number
    totalLosses: number
    overallWinPercentage: number
  }
}

export default function NHSCAAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/nhsca-placements/analytics?state=NC&startYear=2020")
      const result = await response.json()

      if (result.success) {
        setData(result.stats)
      } else {
        setError(result.error || "Failed to load analytics")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>No data available</div>
      </div>
    )
  }

  // Prepare chart data
  const winPercentageChartData = data.byYear.map((year) => ({
    year: year.year.toString(),
    "Win %": Math.round(year.winPercentage * 100) / 100,
    Participants: year.participants,
  }))

  const participantsChartData = data.byYear.map((year) => ({
    year: year.year.toString(),
    Participants: year.participants,
    Placers: year.placers,
  }))

  const classChartData = data.byClass.map((classStat) => ({
    class: `Class of ${classStat.class}`,
    Participants: classStat.participants,
    Placers: classStat.placers,
    "Win %": Math.round(classStat.winPercentage * 100) / 100,
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">NHSCA Analytics - North Carolina</h1>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overall.totalParticipants.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Placers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overall.totalPlacers.toLocaleString()}</div>
            <div className="text-sm text-gray-500">
              {data.overall.totalParticipants > 0
                ? Math.round((data.overall.totalPlacers / data.overall.totalParticipants) * 100 * 100) / 100
                : 0}
              % placement rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overall Win %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overall.overallWinPercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">
              {data.overall.totalWins}W - {data.overall.totalLosses}L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Best Year</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bestYears.length > 0 ? (
              <>
                <div className="text-2xl font-bold">{data.bestYears[0].year}</div>
                <div className="text-sm text-gray-500">{data.bestYears[0].winPercentage.toFixed(1)}% win rate</div>
              </>
            ) : (
              <div className="text-gray-500">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Win Percentage Over Time */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Win Percentage by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={winPercentageChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: "Win %", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="Win %" stroke="#002147" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Participants & Placers Over Time */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Participants & Placers by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={participantsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Participants" fill="#002147" />
              <Bar dataKey="Placers" fill="#BC0B03" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By Graduation Class */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Participants by Graduation Class</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="class" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Participants" fill="#002147" />
              <Bar dataKey="Placers" fill="#BC0B03" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Best Years Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top 5 Years by Win Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Year</th>
                  <th className="text-right p-2">Participants</th>
                  <th className="text-right p-2">Placers</th>
                  <th className="text-right p-2">Wins</th>
                  <th className="text-right p-2">Losses</th>
                  <th className="text-right p-2">Win %</th>
                </tr>
              </thead>
              <tbody>
                {data.bestYears.map((year) => (
                  <tr key={year.year} className="border-b">
                    <td className="p-2 font-semibold">{year.year}</td>
                    <td className="p-2 text-right">{year.participants}</td>
                    <td className="p-2 text-right">{year.placers}</td>
                    <td className="p-2 text-right">{year.wins}</td>
                    <td className="p-2 text-right">{year.losses}</td>
                    <td className="p-2 text-right font-semibold">{year.winPercentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Year-by-Year Details */}
      <Card>
        <CardHeader>
          <CardTitle>Year-by-Year Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Year</th>
                  <th className="text-right p-2">Participants</th>
                  <th className="text-right p-2">Placers</th>
                  <th className="text-right p-2">Wins</th>
                  <th className="text-right p-2">Losses</th>
                  <th className="text-right p-2">Win %</th>
                  <th className="text-left p-2">Placement Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {data.byYear.map((year) => (
                  <tr key={year.year} className="border-b">
                    <td className="p-2 font-semibold">{year.year}</td>
                    <td className="p-2 text-right">{year.participants}</td>
                    <td className="p-2 text-right">{year.placers}</td>
                    <td className="p-2 text-right">{year.wins}</td>
                    <td className="p-2 text-right">{year.losses}</td>
                    <td className="p-2 text-right font-semibold">{year.winPercentage.toFixed(1)}%</td>
                    <td className="p-2 text-sm">
                      {Object.entries(year.placementBreakdown)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([place, count]) => `${place}: ${count}`)
                        .join(", ") || "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

