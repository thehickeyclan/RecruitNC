"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Summary = {
  totalUsers: number
  signupsToday: number
  loginsToday: number
  activeLast30Days: number
}

export default function UserStats() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/admin/analytics/user-activity", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to load user activity (${res.status})`)
        const data = await res.json()
        setSummary(data.summary)
      } catch (e: any) {
        setError(e?.message || "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border">
        <CardHeader>
          <CardTitle>Total Users</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {loading ? "…" : error ? "-" : (summary?.totalUsers ?? 0)}
        </CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <CardTitle>Signups Today</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {loading ? "…" : error ? "-" : (summary?.signupsToday ?? 0)}
        </CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <CardTitle>Logins Today</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {loading ? "…" : error ? "-" : (summary?.loginsToday ?? 0)}
        </CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <CardTitle>Active (30d)</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {loading ? "…" : error ? "-" : (summary?.activeLast30Days ?? 0)}
        </CardContent>
      </Card>
    </div>
  )
}
