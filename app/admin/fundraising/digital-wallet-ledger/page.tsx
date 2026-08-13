"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  RefreshCw,
  Search,
  TrendingUp,
  Receipt,
  Landmark,
  PiggyBank,
  Gift,
  Users,
  ExternalLink,
  AlertCircle,
  GraduationCap,
} from "lucide-react"

type LedgerRow = {
  rowKind: "athlete" | "pool"
  athleteId: string
  poolKey?: "ncu_training_fund"
  name: string
  slug: string | null
  fundraisingCode: string | null
  raisedCents: number
  reimbursementsPaidCents: number
  guildAllocationsCents: number
  programOutflowsCents: number
  availableCents: number
  giftCount: number
  codeUnavailable?: boolean
}

type Totals = {
  rowCount: number
  raisedCents: number
  reimbursementsPaidCents: number
  guildAllocationsCents: number
  programOutflowsCents: number
  availableCents: number
  giftCount: number
}

type Summary = {
  registryCampaignPaidTotalCents: number
  combinedAttributedRaisedCents: number
  unattributedVarianceCents: number
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export default function AdminDigitalWalletLedgerPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/fundraising/digital-wallet-ledger", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load ledger")
      setRows(data.rows ?? [])
      setTotals(data.totals ?? null)
      setSummary(data.summary ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && isAdmin) load()
  }, [user, isAdmin, load])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter((r) => {
      if (
        r.name.toLowerCase().includes(q) ||
        (r.fundraisingCode?.toLowerCase().includes(q) ?? false) ||
        (r.slug?.toLowerCase().includes(q) ?? false)
      ) {
        return true
      }
      if (r.rowKind === "pool" && r.poolKey === "ncu_training_fund") {
        const terms = ["training", "fund", "nc united", "scholarship", "pool", "ncu"]
        return terms.some((term) => q.includes(term))
      }
      return false
    })
  }, [rows, searchQuery])

  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        rowCount: acc.rowCount + 1,
        raisedCents: acc.raisedCents + r.raisedCents,
        reimbursementsPaidCents: acc.reimbursementsPaidCents + r.reimbursementsPaidCents,
        guildAllocationsCents: acc.guildAllocationsCents + r.guildAllocationsCents,
        programOutflowsCents: acc.programOutflowsCents + r.programOutflowsCents,
        availableCents: acc.availableCents + r.availableCents,
        giftCount: acc.giftCount + r.giftCount,
      }),
      {
        rowCount: 0,
        raisedCents: 0,
        reimbursementsPaidCents: 0,
        guildAllocationsCents: 0,
        programOutflowsCents: 0,
        availableCents: 0,
        giftCount: 0,
      },
    )
  }, [filtered])

  if (authLoading) {
    return (
      <div className="admin-dark-page flex min-h-screen items-center justify-center bg-[#0A1628]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  const t = totals

  return (
    <div className="admin-dark-page min-h-screen bg-[#0A1628]">
      <div className="border-b border-[#1e3a5f] bg-gradient-to-b from-[#13294B] to-[#0A1628]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/fundraising")}
                className="text-gray-400 hover:bg-[#1e3a5f] hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Admin</p>
                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Digital wallet ledger</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-400">
                  <span className="text-white/90">Where every credited dollar lives:</span> each athlete wallet (reimbursements +
                  Guild + available) plus the <strong className="text-[#D3B574]">NC United Training Fund</strong> (scholarship
                  allocations + unallocated balance). Registry total compares mirror gifts to attributed rows — investigate
                  variance before sign-off.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={isLoading}
              className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        {!isLoading && summary ? (
          <div className="mb-6 rounded-lg border border-[#1e3a5f] bg-[#0F1E32] px-4 py-3 text-sm text-gray-300">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#D3B574]">Registry reconciliation (mirror)</p>
            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
              <span>
                Paid in (registry campaigns):{" "}
                <strong className="tabular-nums text-white">{formatUsd(summary.registryCampaignPaidTotalCents)}</strong>
              </span>
              <span>
                Attributed on this sheet (athletes + training fund gross):{" "}
                <strong className="tabular-nums text-white">{formatUsd(summary.combinedAttributedRaisedCents)}</strong>
              </span>
              <span>
                Variance:{" "}
                <strong
                  className={`tabular-nums ${Math.abs(summary.unattributedVarianceCents) < 100 ? "text-green-400" : "text-amber-300"}`}
                >
                  {formatUsd(summary.unattributedVarianceCents)}
                </strong>
                <span className="ml-1 text-xs text-gray-500">
                  (uncredited codes, Stripe vs mirror lag, or gifts outside attribution)
                </span>
              </span>
            </div>
          </div>
        ) : null}

        {/* Summary tiles */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/20">
                  <Users className="h-5 w-5 text-slate-300" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rows</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-12 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-white">{t?.rowCount ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Total raised</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24 bg-[#1e3a5f]" />
                  ) : (
                    <p className="truncate text-lg font-bold text-green-400 sm:text-xl">
                      {formatUsd(t?.raisedCents ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                  <Receipt className="h-5 w-5 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Reimbursements</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24 bg-[#1e3a5f]" />
                  ) : (
                    <p className="truncate text-lg font-bold text-orange-400 sm:text-xl">
                      {formatUsd(t?.reimbursementsPaidCents ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                  <Landmark className="h-5 w-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Guild</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24 bg-[#1e3a5f]" />
                  ) : (
                    <p className="truncate text-lg font-bold text-amber-300 sm:text-xl">
                      {formatUsd(t?.guildAllocationsCents ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
                  <GraduationCap className="h-5 w-5 text-violet-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Training → scholarships</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24 bg-[#1e3a5f]" />
                  ) : (
                    <p className="truncate text-lg font-bold text-violet-200 sm:text-xl">
                      {formatUsd(t?.programOutflowsCents ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D3B574]/20">
                  <PiggyBank className="h-5 w-5 text-[#D3B574]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Available</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24 bg-[#1e3a5f]" />
                  ) : (
                    <p className="truncate text-lg font-bold text-[#D3B574] sm:text-xl">
                      {formatUsd(t?.availableCents ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1e3a5f] bg-[#0F1E32]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Gift className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Gifts</p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-12 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-white">{t?.giftCount ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Filter by name, NCU code, or slug…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-[#1e3a5f] bg-[#0F1E32] pl-10 text-white placeholder:text-gray-500"
          />
        </div>

        <Card className="border-[#1e3a5f] bg-[#0F1E32]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1e3a5f] hover:bg-transparent">
                    <TableHead className="text-gray-400">Athlete / pool</TableHead>
                    <TableHead className="text-gray-400">NCU</TableHead>
                    <TableHead className="text-right text-gray-400">Raised</TableHead>
                    <TableHead className="text-right text-gray-400">Reimbursed</TableHead>
                    <TableHead className="text-right text-gray-400">Guild</TableHead>
                    <TableHead className="text-right text-gray-400">Program out</TableHead>
                    <TableHead className="text-right text-gray-400">Available</TableHead>
                    <TableHead className="text-right text-gray-400">Gifts</TableHead>
                    <TableHead className="text-gray-400">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <TableRow key={i} className="border-[#1e3a5f]">
                        <TableCell colSpan={9}>
                          <Skeleton className="h-10 w-full bg-[#1e3a5f]" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow className="border-[#1e3a5f]">
                      <TableCell colSpan={9} className="py-12 text-center text-gray-400">
                        No rows match your filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow
                        key={r.athleteId}
                        className={`border-[#1e3a5f] hover:bg-[#13294B]/60 ${r.rowKind === "pool" ? "bg-[#13294B]/25" : ""}`}
                      >
                        <TableCell className="font-medium text-white">
                          {r.name}
                          {r.rowKind === "pool" ? (
                            <span className="ml-2 rounded border border-violet-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                              Pool
                            </span>
                          ) : null}
                          {r.codeUnavailable ? (
                            <span className="ml-2 text-xs text-amber-400/90">No code</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-300">
                          {r.fundraisingCode ?? (r.rowKind === "pool" ? "—" : "—")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-400">
                          {formatUsd(r.raisedCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-400">
                          {formatUsd(r.reimbursementsPaidCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-300">
                          {formatUsd(r.guildAllocationsCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-violet-200">
                          {r.programOutflowsCents > 0 ? formatUsd(r.programOutflowsCents) : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${
                            r.availableCents < 0 ? "text-red-400" : "text-[#D3B574]"
                          }`}
                        >
                          {formatUsd(r.availableCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-300">{r.giftCount}</TableCell>
                        <TableCell>
                          {r.rowKind === "pool" && r.poolKey === "ncu_training_fund" ? (
                            <a
                              href="/fundraising/training-fund"
                              className="inline-flex items-center gap-1 text-sm text-violet-200 hover:underline"
                            >
                              Training fund <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : r.slug ? (
                            <a
                              href={`/fundraising/athletes/${encodeURIComponent(r.slug)}`}
                              className="inline-flex items-center gap-1 text-sm text-[#D3B574] hover:underline"
                            >
                              Gift page <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {!isLoading && filtered.length > 0 ? (
                  <TableFooter>
                    <TableRow className="border-t-2 border-[#D3B574]/40 bg-[#0A1628] hover:bg-[#0A1628]">
                      <TableCell className="font-bold text-white">
                        {searchQuery.trim() ? `Filtered (${filtered.length})` : "All rows"}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-bold tabular-nums text-green-400">
                        {formatUsd(filteredTotals.raisedCents)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-orange-400">
                        {formatUsd(filteredTotals.reimbursementsPaidCents)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-amber-300">
                        {formatUsd(filteredTotals.guildAllocationsCents)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-violet-200">
                        {formatUsd(filteredTotals.programOutflowsCents)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-[#D3B574]">
                        {formatUsd(filteredTotals.availableCents)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-gray-200">
                        {filteredTotals.giftCount}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
