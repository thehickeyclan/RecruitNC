"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Legend,
} from "recharts"
import UserStats from "@/components/admin/user-stats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type DailyPoint = { date: string; signups: number; logins: number }
type WeeklyPoint = { week: string; signups: number; logins: number }
type MonthlyPoint = { month: string; signups: number; logins: number }

type AnalyticsPayload = {
  success: boolean
  summary: {
    totalUsers: number
    signupsToday: number
    loginsToday: number
    activeLast30Days: number
  }
  usersLoggedInToday: Array<{ id: string; email: string; last_sign_in_at: string }>
  daily: DailyPoint[]
  weekly: WeeklyPoint[]
  monthly: MonthlyPoint[]
}

type UserProfile = {
  user_id: string
  name: string | null
  email: string
  role: string | null
  cell_phone: string | null
  created_at: string
  is_admin: boolean
  last_sign_in_at: string | null
}

export default function UsersDashboardPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsPayload | null>(null)
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignedUpToday, setShowSignedUpToday] = useState(false)
  const [showLoggedInToday, setShowLoggedInToday] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingRole, setEditingRole] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        console.log("[v0] Fetching user profiles from /api/admin/users/profiles")

        const [analyticsRes, profilesRes] = await Promise.all([
          fetch("/api/admin/analytics/user-activity", { cache: "no-store" }),
          fetch("/api/admin/users/profiles", { cache: "no-store" }),
        ])

        console.log("[v0] Analytics response status:", analyticsRes.status)
        console.log("[v0] Profiles response status:", profilesRes.status)

        if (!analyticsRes.ok) throw new Error(`Failed to load analytics (${analyticsRes.status})`)
        if (!profilesRes.ok) throw new Error(`Failed to load profiles (${profilesRes.status})`)

        const analytics = await analyticsRes.json()
        const profilesData = await profilesRes.json()

        console.log("[v0] Profiles data:", profilesData)
        console.log("[v0] Number of profiles:", profilesData.profiles?.length || 0)

        setAnalyticsData(analytics)
        setProfiles(profilesData.profiles || [])
      } catch (e: any) {
        console.error("[v0] Error loading dashboard:", e)
        setError(e?.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) throw new Error("Failed to update role")

      setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, role: newRole } : p)))
      setEditingRole(null)
    } catch (e: any) {
      alert(e?.message || "Failed to update role")
    }
  }

  const filteredProfiles = useMemo(() => {
    let filtered = profiles

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          p.role?.toLowerCase().includes(query),
      )
    }

    if (showSignedUpToday) {
      const today = new Date().toDateString()
      filtered = filtered.filter((p) => new Date(p.created_at).toDateString() === today)
    }

    if (showLoggedInToday && analyticsData?.usersLoggedInToday) {
      const loggedInTodayIds = new Set(analyticsData.usersLoggedInToday.map((u) => u.id))
      filtered = filtered.filter((p) => loggedInTodayIds.has(p.user_id))
    }

    return filtered
  }, [profiles, searchQuery, showSignedUpToday, showLoggedInToday, analyticsData])

  const groupedByRole = useMemo(() => {
    const groups: Record<string, UserProfile[]> = {}
    filteredProfiles.forEach((profile) => {
      const role = profile.role || "other"
      if (!groups[role]) groups[role] = []
      groups[role].push(profile)
    })
    return groups
  }, [filteredProfiles])

  const roleDistribution = useMemo(() => {
    return Object.entries(groupedByRole).map(([role, users]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: users.length,
      role: role,
    }))
  }, [groupedByRole])

  const ROLE_COLORS: Record<string, string> = {
    admin: "hsl(var(--chart-1))",
    athlete: "hsl(var(--chart-2))",
    parent: "hsl(var(--chart-3))",
    college_coach: "hsl(var(--chart-4))",
    coach: "hsl(var(--chart-5))",
    referee: "hsl(220, 70%, 50%)",
    fan: "hsl(280, 70%, 50%)",
    other: "hsl(0, 0%, 60%)",
  }

  const daily = analyticsData?.daily ?? []
  const weekly = analyticsData?.weekly ?? []
  const monthly = analyticsData?.monthly ?? []

  const chartConfig = useMemo(
    () => ({
      signups: {
        label: "Signups",
        color: "hsl(var(--chart-1))",
      },
      logins: {
        label: "Logins",
        color: "hsl(var(--chart-2))",
      },
    }),
    [],
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Dashboard</h1>
        <p className="text-gray-600">User analytics, signups, logins, and user management</p>
      </div>

      <div className="mb-8">
        <UserStats />
      </div>

      {loading ? (
        <div className="text-gray-600">Loading dashboard…</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <>
          <Card className="border mb-6">
            <CardHeader>
              <CardTitle>User Distribution by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={
                  Object.fromEntries(
                    Object.entries(ROLE_COLORS).map(([role, color]) => [
                      role,
                      { label: role.charAt(0).toUpperCase() + role.slice(1), color },
                    ]),
                  ) as any
                }
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ROLE_COLORS[entry.role] || "hsl(0, 0%, 60%)"} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 mb-8">
            {/* Signups Chart */}
            <Card className="border">
              <CardHeader>
                <CardTitle>Signups</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="daily" className="w-full">
                  <TabsList>
                    <TabsTrigger value="daily">Daily (30d)</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly (12w)</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly (12m)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="daily">
                    <ChartContainer config={chartConfig as any} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="signups"
                            name="Signups"
                            stroke="var(--color-signups)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>

                  <TabsContent value="weekly">
                    <ChartContainer config={chartConfig as any} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weekly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="signups"
                            name="Signups"
                            stroke="var(--color-signups)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>

                  <TabsContent value="monthly">
                    <ChartContainer config={chartConfig as any} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="signups"
                            name="Signups"
                            stroke="var(--color-signups)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Logins Chart */}
            <Card className="border">
              <CardHeader>
                <CardTitle>Logins</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="daily" className="w-full">
                  <TabsList>
                    <TabsTrigger value="daily">Daily (30d)</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly (12w)</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly (12m)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="daily">
                    <ChartContainer config={chartConfig as any} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="logins"
                            name="Logins"
                            stroke="var(--color-logins)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>

                  <TabsContent value="weekly">
                    <ChartContainer config={chartConfig as any} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weekly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="logins"
                            name="Logins"
                            stroke="var(--color-logins)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>

                  <TabsContent value="monthly">
                    <ChartContainer config={chartConfig as any} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="logins"
                            name="Logins"
                            stroke="var(--color-logins)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Who Logged In Today section */}
          {analyticsData?.usersLoggedInToday && analyticsData.usersLoggedInToday.length > 0 && (
            <Card className="border mb-6">
              <CardHeader>
                <CardTitle>Users Logged In Today ({analyticsData.usersLoggedInToday.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.usersLoggedInToday.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.last_sign_in_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border mb-6">
            <CardHeader>
              <CardTitle>All Users ({filteredProfiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    variant={showSignedUpToday ? "default" : "outline"}
                    onClick={() => setShowSignedUpToday(!showSignedUpToday)}
                    size="sm"
                  >
                    Signed Up Today
                  </Button>
                  <Button
                    variant={showLoggedInToday ? "default" : "outline"}
                    onClick={() => setShowLoggedInToday(!showLoggedInToday)}
                    size="sm"
                  >
                    Logged In Today ({analyticsData?.summary.loginsToday || 0})
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedByRole)
                  .sort(([a], [b]) => {
                    const order = ["admin", "college_coach", "coach", "athlete", "parent", "referee", "fan", "other"]
                    return order.indexOf(a) - order.indexOf(b)
                  })
                  .map(([role, users]) => (
                    <div key={role}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold capitalize">{role}</h3>
                        <Badge variant="secondary">{users.length}</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Admin
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Joined
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Login
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((profile) => (
                              <tr key={profile.user_id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {profile.name || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {editingRole === profile.user_id ? (
                                    <Select
                                      value={profile.role || "other"}
                                      onValueChange={(value) => handleRoleUpdate(profile.user_id, value)}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="athlete">Athlete</SelectItem>
                                        <SelectItem value="parent">Parent</SelectItem>
                                        <SelectItem value="college_coach">College Coach</SelectItem>
                                        <SelectItem value="coach">High School/Club Coach</SelectItem>
                                        <SelectItem value="referee">Referee</SelectItem>
                                        <SelectItem value="fan">Fan</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <button
                                      onClick={() => setEditingRole(profile.user_id)}
                                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full hover:opacity-80 ${
                                        profile.role === "admin"
                                          ? "bg-red-100 text-red-800"
                                          : profile.role === "coach" || profile.role === "college_coach"
                                            ? "bg-blue-100 text-blue-800"
                                            : profile.role === "parent"
                                              ? "bg-green-100 text-green-800"
                                              : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {profile.role || "other"}
                                    </button>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {profile.is_admin ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">No</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {profile.cell_phone || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(profile.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {profile.last_sign_in_at
                                    ? new Date(profile.last_sign_in_at).toLocaleDateString()
                                    : "Never"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
