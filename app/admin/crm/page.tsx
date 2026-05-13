"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HardLink } from "@/components/hard-link"
import { AdminHeader } from "@/components/admin-header"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  RefreshCw,
  Users,
  Shield,
  GraduationCap,
  Activity,
  UserCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react"

type CrmUserRow = {
  user_id: string
  email: string
  name: string
  full_name: string
  role: string | null
  cell_phone: string | null
  is_admin: boolean
  verified_coach: boolean | null
  verification_status: string | null
  school_id: string | null
  school_name: string | null
  athlete_id: string | null
  created_at: string
  last_sign_in_at: string | null
}

const PAGE_SIZE = 25

type SortKey = "full_name" | "email" | "role" | "last_sign_in_at" | "created_at"

function getRelativeTime(date: string | null): string {
  if (!date) return "Never"
  const now = Date.now()
  const past = new Date(date).getTime()
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

function isCoachRole(role: string | null): boolean {
  if (!role) return false
  const r = role.toLowerCase()
  return r.includes("coach") || r === "college_coach"
}

export default function AdminCrmCommandCenterPage() {
  const [profiles, setProfiles] = useState<CrmUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [adminOnly, setAdminOnly] = useState(false)
  const [verifiedCoachOnly, setVerifiedCoachOnly] = useState(false)
  const [hasAthleteOnly, setHasAthleteOnly] = useState(false)
  const [active7dOnly, setActive7dOnly] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>("last_sign_in_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const loadProfiles = useCallback(async () => {
    if (typeof window !== "undefined") {
      const rateLimitCookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("rate_limit_cooldown="))
      if (rateLimitCookie) {
        const cooldownValue = rateLimitCookie.split("=")[1]
        const cooldownTime = parseInt(cooldownValue, 10)
        if (cooldownTime && Date.now() < cooldownTime + 120000) {
          const remainingSeconds = Math.ceil((cooldownTime + 120000 - Date.now()) / 1000)
          const remainingMinutes = Math.ceil(remainingSeconds / 60)
          setError(
            `Rate limit cooldown active. Wait ${remainingSeconds}s (~${remainingMinutes} min) before refreshing.`,
          )
          setLoading(false)
          return
        }
      }
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users/profiles", {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setProfiles(data.profiles || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load users"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const roleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) {
      const r = (p.role || "").trim()
      if (r) set.add(r)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [profiles])

  const kpis = useMemo(() => {
    const total = profiles.length
    const admins = profiles.filter((p) => p.is_admin).length
    const coaches = profiles.filter((p) => isCoachRole(p.role)).length
    const now = Date.now()
    const seven = 7 * 86400000
    const active7d = profiles.filter((p) => {
      if (!p.last_sign_in_at) return false
      return now - new Date(p.last_sign_in_at).getTime() <= seven
    }).length
    const withAthlete = profiles.filter((p) => !!p.athlete_id).length
    return { total, admins, coaches, active7d, withAthlete }
  }, [profiles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return profiles.filter((p) => {
      if (adminOnly && !p.is_admin) return false
      if (verifiedCoachOnly && !p.verified_coach) return false
      if (hasAthleteOnly && !p.athlete_id) return false
      if (active7dOnly) {
        if (!p.last_sign_in_at) return false
        const now = Date.now()
        if (now - new Date(p.last_sign_in_at).getTime() > 7 * 86400000) return false
      }
      if (roleFilter !== "all" && (p.role || "") !== roleFilter) return false
      if (!q) return true
      const hay = [
        p.email,
        p.full_name,
        p.name,
        p.role,
        p.school_name,
        p.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [
    profiles,
    search,
    roleFilter,
    adminOnly,
    verifiedCoachOnly,
    hasAthleteOnly,
    active7dOnly,
  ])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let va: string | number | null = null
      let vb: string | number | null = null
      switch (sortKey) {
        case "full_name":
          va = (a.full_name || a.email).toLowerCase()
          vb = (b.full_name || b.email).toLowerCase()
          break
        case "email":
          va = a.email.toLowerCase()
          vb = b.email.toLowerCase()
          break
        case "role":
          va = (a.role || "").toLowerCase()
          vb = (b.role || "").toLowerCase()
          break
        case "last_sign_in_at":
          va = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
          vb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
          break
        case "created_at":
          va = new Date(a.created_at).getTime()
          vb = new Date(b.created_at).getTime()
          break
        default:
          break
      }
      if (va === vb) return 0
      if (va === null || vb === null) return 0
      const cmp = va < vb ? -1 : 1
      return sortDir === "asc" ? cmp : -cmp
    })
    return copy
  }, [filtered, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, adminOnly, verifiedCoachOnly, hasAthleteOnly, active7dOnly, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageSlice = sorted.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "full_name" || key === "email" || key === "role" ? "asc" : "desc")
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" aria-hidden />
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" aria-hidden />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden />
    )
  }

  return (
    <>
      <AdminHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#003366] dark:text-blue-300">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Admin
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              User command center
            </h1>
            <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
              Filter the roster, scan health at a glance, then open a full contact workspace for any account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadProfiles()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
              Refresh
            </Button>
            <HardLink
              href="/admin/users-dashboard"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Classic user dashboard
            </HardLink>
          </div>
        </div>

        {error ? (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardHeader className="py-4">
              <CardTitle className="text-base text-destructive">Could not load users</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-[#003366]/15 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total users</CardTitle>
              <Users className="h-4 w-4 text-[#003366]" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{loading ? "—" : kpis.total}</div>
            </CardContent>
          </Card>
          <Card className="border-[#003366]/15 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
              <Shield className="h-4 w-4 text-amber-600" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{loading ? "—" : kpis.admins}</div>
            </CardContent>
          </Card>
          <Card className="border-[#003366]/15 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Coach roles</CardTitle>
              <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{loading ? "—" : kpis.coaches}</div>
            </CardContent>
          </Card>
          <Card className="border-[#003366]/15 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active (7d)</CardTitle>
              <Activity className="h-4 w-4 text-sky-600" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{loading ? "—" : kpis.active7d}</div>
            </CardContent>
          </Card>
          <Card className="border-[#003366]/15 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Primary athlete</CardTitle>
              <UserCircle2 className="h-4 w-4 text-violet-600" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{loading ? "—" : kpis.withAthlete}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Showing {filtered.length} of {profiles.length} users
              {loading ? " · Loading…" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="crm-search">Search</Label>
                <Input
                  id="crm-search"
                  placeholder="Name, email, school, user id…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Profile role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sw-admin" className="text-sm font-normal">
                    Admins only
                  </Label>
                  <Switch id="sw-admin" checked={adminOnly} onCheckedChange={setAdminOnly} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sw-coach" className="text-sm font-normal">
                    Verified coach
                  </Label>
                  <Switch id="sw-coach" checked={verifiedCoachOnly} onCheckedChange={setVerifiedCoachOnly} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sw-athlete" className="text-sm font-normal">
                    Has primary athlete
                  </Label>
                  <Switch id="sw-athlete" checked={hasAthleteOnly} onCheckedChange={setHasAthleteOnly} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sw-7d" className="text-sm font-normal">
                    Signed in (7d)
                  </Label>
                  <Switch id="sw-7d" checked={active7dOnly} onCheckedChange={setActive7dOnly} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-md">
          <CardHeader className="border-b bg-muted/20 py-4">
            <CardTitle className="text-lg">Directory</CardTitle>
            <CardDescription>
              Row opens the CRM workspace (full page load). Page {pageClamped} of {totalPages}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[220px]">
                      <button
                        type="button"
                        className="flex items-center font-semibold"
                        onClick={() => toggleSort("full_name")}
                      >
                        Name
                        <SortIcon k="full_name" />
                      </button>
                    </TableHead>
                    <TableHead className="min-w-[200px]">
                      <button
                        type="button"
                        className="flex items-center font-semibold"
                        onClick={() => toggleSort("email")}
                      >
                        Email
                        <SortIcon k="email" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center font-semibold"
                        onClick={() => toggleSort("role")}
                      >
                        Role
                        <SortIcon k="role" />
                      </button>
                    </TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center font-semibold"
                        onClick={() => toggleSort("last_sign_in_at")}
                      >
                        Last active
                        <SortIcon k="last_sign_in_at" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Workspace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        Loading users…
                      </TableCell>
                    </TableRow>
                  ) : pageSlice.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No users match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageSlice.map((p) => (
                      <TableRow key={p.user_id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{p.full_name || p.email}</span>
                            {p.is_admin ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Admin
                              </Badge>
                            ) : null}
                            {p.verified_coach ? (
                              <Badge variant="outline" className="text-[10px]">
                                Verified coach
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {p.role || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {p.school_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {getRelativeTime(p.last_sign_in_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <HardLink
                            href={`/admin/users/${p.user_id}/crm`}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium",
                              "text-[#003366] underline-offset-4 hover:underline dark:text-blue-300",
                            )}
                          >
                            Open
                            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          </HardLink>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {sorted.length} result{sorted.length !== 1 ? "s" : ""} · {PAGE_SIZE} per page
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageClamped <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageClamped >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  )
}
