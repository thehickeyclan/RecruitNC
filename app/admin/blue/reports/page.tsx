"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts"
import { ArrowLeft, Loader2, TrendingUp, Users, GraduationCap, DollarSign } from "lucide-react"
import type { BlueReportsData } from "@/app/api/admin/blue/reports/route"

const NAVY = "#13294B"
const GOLD = "#D3B574"

export default function AdminBlueReportsPage() {
  const [data, setData] = useState<BlueReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/blue/reports", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-[#13294B]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Failed to load reports.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin/blue" prefetch={false}>Back to Blue</Link>
        </Button>
      </div>
    )
  }

  const trendChartData = data.membershipTrend.map((t) => ({
    ...t,
    monthLabel: t.month.slice(0, 7).replace("-", " "),
  }))

  const classChartData = data.byClass.map((c) => ({
    name: `Class of ${c.graduationYear}`,
    count: c.count,
    fill: c.isAnticipatedChurn ? "#ef4444" : NAVY,
    isChurn: c.isAnticipatedChurn,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue" prefetch={false}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Blue reports</h1>
            <p className="text-sm text-gray-600">Billings, growth, and class distribution for churn planning.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active members</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.currentActive}</p>
              {data.currentPaused > 0 && <p className="text-xs text-gray-500">+ {data.currentPaused} paused</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Est. MRR</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">${data.estimatedMRR.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Active + paused × $55</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm">Anticipated churn</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.anticipatedChurnCount}</p>
              <p className="text-xs text-gray-500">Class of {new Date().getFullYear()} (graduating)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Last 24 months</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">
                {data.membershipTrend.reduce((s, t) => s + t.newCount, 0)}
              </p>
              <p className="text-xs text-gray-500">New subscriptions</p>
            </CardContent>
          </Card>
        </div>

        {/* Membership over time */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Memberships over time</CardTitle>
            <CardDescription>New vs ended per month and active count at end of month (last 24 months).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value, ""]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ""}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="activeAtEnd" name="Active at end of month" stroke={NAVY} fill={NAVY} fillOpacity={0.3} />
                  <Bar yAxisId="left" dataKey="newCount" name="New" fill={GOLD} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="endedCount" name="Ended" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Estimated MRR over time */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estimated MRR over time</CardTitle>
            <CardDescription>Active + paused × $55 per month (last 24 months).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Est. MRR"]} />
                  <Line type="monotone" dataKey="estimatedMRR" name="Est. MRR" stroke={NAVY} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Class distribution (graduation year) */}
        <Card>
          <CardHeader>
            <CardTitle>Members by class (graduation year)</CardTitle>
            <CardDescription>Anticipated churn: Class of {new Date().getFullYear()} will graduate this year. Plan invites to offset.</CardDescription>
          </CardHeader>
          <CardContent>
            {classChartData.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No active/paused members with graduation year on file.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [value, "Members"]} />
                    <Bar dataKey="count" name="Members" radius={[0, 4, 4, 0]}>
                      {classChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
