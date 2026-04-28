"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

type Row = {
  id: string
  user_id: string
  athlete_id: string
  amount_cents: number
  status: string
  guild_credit_ids: unknown
  guild_balance_cents_after: number | null
  error_message: string | null
  campaign: string
  created_at: string
  updated_at: string
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export default function AdminGuildCreditAllocationsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch("/api/admin/guild-credit-allocations", { cache: "no-store", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Failed to load")
      }
      setRows((data as { allocations?: Row[] }).allocations ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/guild-credit-allocations")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void load()
  }, [user, isAdmin, authLoading, load])

  if (authLoading || !user || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <HardLink href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin home
              </HardLink>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Guild credit allocations</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>RecruitNC → Guild ledger</CardTitle>
            <CardDescription>
              Parent allocations from Spartan fundraising notional balance. Link parents by email on{" "}
              <HardLink href="/admin/guild-parent-link" className="underline font-medium">
                Guild parent link
              </HardLink>{" "}
              (sets <code className="text-xs">guild_parent_user_id</code> on <code className="text-xs">user_profiles</code>).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {err && <p className="text-sm text-destructive mb-4">{err}</p>}
            {loading && !rows ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : (rows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No allocations yet (or table not migrated).</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.user_id}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.athlete_id}</TableCell>
                        <TableCell className="text-sm">{money(r.amount_cents)}</TableCell>
                        <TableCell className="text-sm">{r.status}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                          {r.error_message ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
