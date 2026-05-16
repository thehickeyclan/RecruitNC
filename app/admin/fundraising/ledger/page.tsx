"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
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
import { toast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  AlertCircle,
  Filter,
} from "lucide-react"

interface LedgerEntry {
  id: string
  occurred_at: string
  direction: "money_in" | "money_out" | "internal_move"
  entry_kind: string
  amount_cents: number
  summary: string
  detail: string | null
  athlete_code: string | null
  stripe_checkout_session_id: string | null
  athlete_expense_request_id: string | null
}

const DIRECTION_CONFIG = {
  money_in: { label: "In", color: "text-green-400", bg: "bg-green-500/20", icon: ArrowDownLeft },
  money_out: { label: "Out", color: "text-red-400", bg: "bg-red-500/20", icon: ArrowUpRight },
  internal_move: { label: "Move", color: "text-blue-400", bg: "bg-blue-500/20", icon: ArrowLeftRight },
}

const KIND_LABELS: Record<string, string> = {
  stripe_spartan_checkout: "Donation",
  reimbursement_paid: "Reimbursement",
  training_fund_to_scholarship: "Scholarship Transfer",
  guild_credit_allocation: "Guild Credit",
}

export default function AdminLedgerPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldExport = searchParams.get("export") === "true"

  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [directionFilter, setDirectionFilter] = useState<"all" | "money_in" | "money_out" | "internal_move">("all")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/fundraising/ledger?limit=500", {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setEntries(data.entries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && isAdmin) {
      loadEntries()
      // Auto-trigger export if URL param is set
      if (shouldExport) {
        handleExport()
      }
    }
  }, [user, isAdmin, loadEntries, shouldExport])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.athlete_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.detail?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDirection = directionFilter === "all" || e.direction === directionFilter

    return matchesSearch && matchesDirection
  })

  const totals = {
    moneyIn: entries.filter((e) => e.direction === "money_in").reduce((sum, e) => sum + e.amount_cents, 0),
    moneyOut: entries.filter((e) => e.direction === "money_out").reduce((sum, e) => sum + e.amount_cents, 0),
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch("/api/admin/fundraising-ledger/export", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fundraising-ledger-audit-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({ title: "Audit export downloaded" })
    } catch {
      toast({ title: "Export failed", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
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
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Audit Ledger</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadEntries}
                disabled={isLoading}
                className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export for Accountant"}
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
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Total Money In</p>
              {isLoading ? (
                <Skeleton className="h-7 w-24 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-green-400">{formatCurrency(totals.moneyIn)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Total Money Out</p>
              {isLoading ? (
                <Skeleton className="h-7 w-24 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-red-400">{formatCurrency(totals.moneyOut)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Net Balance</p>
              {isLoading ? (
                <Skeleton className="h-7 w-24 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-[#D3B574]">
                  {formatCurrency(totals.moneyIn - totals.moneyOut)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0F1E32] border-[#1e3a5f] text-white placeholder:text-gray-500"
            />
          </div>
          <Select
            value={directionFilter}
            onValueChange={(v) => setDirectionFilter(v as typeof directionFilter)}
          >
            <SelectTrigger className="w-full sm:w-48 bg-[#0F1E32] border-[#1e3a5f] text-white">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
              <SelectItem value="all" className="text-white">All Transactions</SelectItem>
              <SelectItem value="money_in" className="text-white">Money In</SelectItem>
              <SelectItem value="money_out" className="text-white">Money Out</SelectItem>
              <SelectItem value="internal_move" className="text-white">Internal Moves</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entries List */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-[#1e3a5f]" />
            ))
          ) : filteredEntries.length === 0 ? (
            <Card className="bg-[#0F1E32] border-[#1e3a5f]">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No ledger entries found</p>
              </CardContent>
            </Card>
          ) : (
            filteredEntries.map((entry) => {
              const config = DIRECTION_CONFIG[entry.direction]
              const Icon = config.icon
              return (
                <Card key={entry.id} className="bg-[#0F1E32] border-[#1e3a5f]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-white truncate">{entry.summary}</p>
                          <Badge className={`text-xs ${
                            entry.direction === "money_in" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            entry.direction === "money_out" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }`}>
                            {KIND_LABELS[entry.entry_kind] || entry.entry_kind}
                          </Badge>
                        </div>
                        {entry.detail && (
                          <p className="text-sm text-gray-400 truncate">{entry.detail}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(entry.occurred_at)}
                          {entry.athlete_code && (
                            <span className="ml-2 font-mono">{entry.athlete_code}</span>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${config.color}`}>
                          {entry.direction === "money_out" ? "-" : "+"}
                          {formatCurrency(entry.amount_cents)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Showing count */}
        {!isLoading && filteredEntries.length > 0 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
        )}
      </div>
    </div>
  )
}
