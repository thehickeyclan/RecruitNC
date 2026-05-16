"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { 
  DollarSign, Users, FileCheck, Receipt, TrendingUp, 
  ChevronDown, ChevronUp, Search, ExternalLink,
  AlertCircle, Sparkles, RefreshCw, Lightbulb, Wallet,
  Eye, Link2, CheckCircle, Clock, X, TrendingDown,
  User, Gift, Loader2
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FundraisingHubActivityRow } from "@/lib/fundraising/hub-data"

// AI Insights Component
function AIInsights() {
  const [insights, setInsights] = useState<{
    summary: string
    recommendations: string[]
    generatedAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInsights = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch("/api/admin/fundraising/ai-insights")
      if (res.ok) {
        const data = await res.json()
        setInsights(data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
        <div className="flex items-center gap-3">
          <div className="animate-pulse rounded-lg bg-blue-100 p-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-48 animate-pulse rounded bg-blue-100" />
            <div className="mt-2 h-3 w-full animate-pulse rounded bg-blue-50" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !insights) {
    return null
  }

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">AI Summary</h3>
            <p className="mt-1 text-sm text-gray-700">{insights.summary}</p>
            
            {insights.recommendations.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                  <Lightbulb className="h-3 w-3" />
                  Recommendations
                </div>
                <ul className="mt-1 space-y-1">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={fetchInsights}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-blue-600"
          title="Refresh insights"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Wallet Preview Modal - Shows exactly what the parent sees
type WalletPreviewData = {
  athlete: {
    id: string
    firstName: string | null
    lastName: string | null
    gradYear: number | null
    highschool: string | null
  }
  profile: {
    slug: string
    isActive: boolean
    checkoutLive: boolean
    goalCents: number
    fundraisingCode: string | null
  } | null
  parent: {
    id: string
    email: string
    name: string | null
  } | null
  hasParentLink: boolean
  wallet: {
    totalRaisedCents: number
    totalSpentCents: number
    availableCents: number
    pendingExpensesCents: number
    giftCount: number
    expenseCount: number
    pendingExpenseCount: number
  }
  recentDonations: {
    id: string
    amountCents: number
    donorName: string | null
    donorEmail: string | null
    message: string | null
    createdAt: string
  }[]
  recentExpenses: {
    id: string
    amountCents: number
    category: string | null
    description: string | null
    status: string
    createdAt: string
    paidAt: string | null
  }[]
}

function WalletPreviewModal({ 
  athleteId, 
  athleteName,
  onClose 
}: { 
  athleteId: string
  athleteName: string
  onClose: () => void 
}) {
  const [data, setData] = useState<WalletPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchWallet = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/admin/fundraising/wallet-preview?athleteId=${athleteId}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setError("Failed to load wallet")
        }
      } catch {
        setError("Failed to load wallet")
      } finally {
        setLoading(false)
      }
    }
    fetchWallet()
  }, [athleteId])

  const fmtUsd = (cents: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)

  const fmtDate = (iso: string) => 
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0A1628] border-[#1e3a5f] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="rounded-lg bg-[#D3B574]/20 p-2">
              <Wallet className="h-5 w-5 text-[#D3B574]" />
            </div>
            <div>
              <span className="text-lg">{athleteName}&apos;s Digital Wallet</span>
              <p className="text-xs font-normal text-white/50 mt-0.5">
                What the parent sees in their profile
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-400">{error}</div>
        ) : data ? (
          <div className="space-y-5">
            {/* Parent Connection Status */}
            <div className="rounded-lg bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-sm font-medium text-white">Parent Connection</p>
                    {data.parent ? (
                      <p className="text-xs text-white/60">{data.parent.name || data.parent.email}</p>
                    ) : (
                      <p className="text-xs text-amber-400">No parent linked</p>
                    )}
                  </div>
                </div>
                {data.hasParentLink ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                )}
              </div>
            </div>

            {/* Wallet Stats - Exactly like parent sees */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#13294B]/50 p-4">
                <div className="flex items-center gap-1.5 text-white/50">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Raised</span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-white">
                  {fmtUsd(data.wallet.totalRaisedCents)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {data.wallet.giftCount} gift{data.wallet.giftCount !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="rounded-lg bg-[#13294B]/50 p-4">
                <div className="flex items-center gap-1.5 text-white/50">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Spent</span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-red-400">
                  {fmtUsd(data.wallet.totalSpentCents)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {data.wallet.expenseCount} reimbursement{data.wallet.expenseCount !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="rounded-lg bg-[#D3B574]/10 p-4">
                <div className="flex items-center gap-1.5 text-[#D3B574]/70">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Available</span>
                </div>
                <p className={`mt-1 text-xl font-bold tabular-nums ${
                  data.wallet.availableCents < 0 ? "text-red-400" : "text-[#D3B574]"
                }`}>
                  {fmtUsd(data.wallet.availableCents)}
                </p>
                {data.wallet.pendingExpenseCount > 0 && (
                  <p className="mt-0.5 text-[10px] text-amber-400">
                    {data.wallet.pendingExpenseCount} pending
                  </p>
                )}
              </div>
            </div>

            {/* Fundraising Info */}
            {data.profile && (
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                  Fundraising Page
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">
                      Code: <span className="font-mono text-[#D3B574]">{data.profile.fundraisingCode || "Not assigned"}</span>
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Slug: /fundraising/athletes/{data.profile.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.profile.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" /> Inactive
                      </span>
                    )}
                    {data.profile.checkoutLive && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <DollarSign className="h-3 w-3" /> Checkout Live
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Donations */}
            {data.recentDonations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Gift className="h-3.5 w-3.5" /> Recent Donations
                </p>
                <div className="space-y-2">
                  {data.recentDonations.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{d.donorName || "Anonymous"}</p>
                        <p className="text-xs text-white/40">{fmtDate(d.createdAt)}</p>
                      </div>
                      <p className="font-semibold text-green-400">+{fmtUsd(d.amountCents)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Expenses */}
            {data.recentExpenses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5" /> Recent Expenses
                </p>
                <div className="space-y-2">
                  {data.recentExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{e.category || "Expense"}</p>
                        <p className="text-xs text-white/40">{e.description?.slice(0, 30) || fmtDate(e.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${e.status === "paid" ? "text-red-400" : "text-amber-400"}`}>
                          -{fmtUsd(e.amountCents)}
                        </p>
                        <p className="text-[10px] text-white/40 capitalize">{e.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {data.recentDonations.length === 0 && data.recentExpenses.length === 0 && (
              <div className="py-6 text-center">
                <Wallet className="mx-auto h-10 w-10 text-white/20" />
                <p className="mt-3 text-sm text-white/50">No transactions yet</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type ExpenseRow = {
  id: string
  amount_cents: number
  status: string
  expense_type: string | null
  created_at: string
  paid_at: string | null
  athlete_id: string
  athlete_first_name: string | null
  athlete_last_name: string | null
  parent_email: string | null
  parent_name: string | null
}

type ActivationRequest = {
  id: string
  fundraising_slug: string
  status: string
  created_at: string
  requester_email: string | null
  athlete_first_name: string | null
  athlete_last_name: string | null
}

type ActiveProfile = {
  id: string
  slug: string
  athlete_id: string
  athlete_first_name: string | null
  athlete_last_name: string | null
  total_raised_cents: number
  campaign_goal_cents: number
  checkout_live: boolean
  page_views_30d: number
}

type Panel = "donations" | "reimbursements" | "requests" | "profiles" | null

interface Props {
  totalRaised: number
  donationCount: number
  totalReimbursed: number
  reimbursementCount: number
  pendingRequestCount: number
  activeProfileCount: number
  linkedAthletesCount: number
  totalPageViews: number
  donations: FundraisingHubActivityRow[]
  expenses: ExpenseRow[]
  activationRequests: ActivationRequest[]
  activeProfiles: ActiveProfile[]
}

function fmtCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
    denied: "bg-red-100 text-red-800",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  )
}

export function FundraisingCommandCenter({
  totalRaised,
  donationCount,
  totalReimbursed,
  reimbursementCount,
  pendingRequestCount,
  activeProfileCount,
  linkedAthletesCount,
  totalPageViews,
  donations,
  expenses,
  activationRequests,
  activeProfiles,
}: Props) {
  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [walletPreview, setWalletPreview] = useState<{ athleteId: string; athleteName: string } | null>(null)

  const togglePanel = (panel: Panel) => {
    setActivePanel(activePanel === panel ? null : panel)
    setSearchTerm("")
    setStatusFilter("all")
  }

  // Filtered donations
  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const search = searchTerm.toLowerCase()
      if (!search) return true
      return (
        d.donorDisplay.toLowerCase().includes(search) ||
        d.athleteCredit.toLowerCase().includes(search) ||
        (d.athleteCode?.toLowerCase().includes(search)) ||
        d.campaignNameLabel.toLowerCase().includes(search)
      )
    })
  }, [donations, searchTerm])

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const search = searchTerm.toLowerCase()
      const matchesSearch = !search || 
        (e.athlete_first_name?.toLowerCase().includes(search)) ||
        (e.athlete_last_name?.toLowerCase().includes(search)) ||
        (e.parent_name?.toLowerCase().includes(search)) ||
        (e.expense_type?.toLowerCase().includes(search))
      const matchesStatus = statusFilter === "all" || e.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [expenses, searchTerm, statusFilter])

  // Filtered activation requests
  const filteredRequests = useMemo(() => {
    return activationRequests.filter(r => {
      const search = searchTerm.toLowerCase()
      const matchesSearch = !search || 
        (r.athlete_first_name?.toLowerCase().includes(search)) ||
        (r.athlete_last_name?.toLowerCase().includes(search)) ||
        r.fundraising_slug.toLowerCase().includes(search) ||
        (r.requester_email?.toLowerCase().includes(search))
      const matchesStatus = statusFilter === "all" || r.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [activationRequests, searchTerm, statusFilter])

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return activeProfiles.filter(p => {
      const search = searchTerm.toLowerCase()
      if (!search) return true
      return (
        (p.athlete_first_name?.toLowerCase().includes(search)) ||
        (p.athlete_last_name?.toLowerCase().includes(search)) ||
        p.slug.toLowerCase().includes(search)
      )
    })
  }, [activeProfiles, searchTerm])

  const available = totalRaised - totalReimbursed

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <AIInsights />

      {/* Pending Alert */}
      {pendingRequestCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <AlertCircle className="h-6 w-6 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {pendingRequestCount} pending activation request{pendingRequestCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-amber-700">Families are waiting for their pages to go live.</p>
          </div>
          <button
            onClick={() => togglePanel("requests")}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Stat Tiles - Clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Raised */}
        <button
          onClick={() => togglePanel("donations")}
          className={`rounded-xl border-2 p-5 text-left shadow-sm transition-all hover:shadow-md ${
            activePanel === "donations" 
              ? "border-green-500 bg-green-50" 
              : "border-transparent bg-white hover:border-green-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Raised</p>
            <div className="flex items-center gap-1">
              <DollarSign className="h-5 w-5 text-green-600" />
              {activePanel === "donations" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{fmtCents(totalRaised)}</p>
          <p className="text-sm text-gray-500">{donationCount} donations - click to view</p>
        </button>

        {/* Reimbursed */}
        <button
          onClick={() => togglePanel("reimbursements")}
          className={`rounded-xl border-2 p-5 text-left shadow-sm transition-all hover:shadow-md ${
            activePanel === "reimbursements" 
              ? "border-red-500 bg-red-50" 
              : "border-transparent bg-white hover:border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Reimbursed</p>
            <div className="flex items-center gap-1">
              <Receipt className="h-5 w-5 text-red-600" />
              {activePanel === "reimbursements" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{fmtCents(totalReimbursed)}</p>
          <p className="text-sm text-gray-500">{reimbursementCount} paid - click to view</p>
        </button>

        {/* Available */}
        <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Available Balance</p>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-700">{fmtCents(available)}</p>
          <p className="text-sm text-gray-500">Raised minus reimbursed</p>
        </div>

        {/* Active Pages */}
        <button
          onClick={() => togglePanel("profiles")}
          className={`rounded-xl border-2 p-5 text-left shadow-sm transition-all hover:shadow-md ${
            activePanel === "profiles" 
              ? "border-purple-500 bg-purple-50" 
              : "border-transparent bg-white hover:border-purple-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active Pages</p>
            <div className="flex items-center gap-1">
              <Users className="h-5 w-5 text-purple-600" />
              {activePanel === "profiles" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{activeProfileCount}</p>
          <p className="text-sm text-gray-500">Live fundraising pages</p>
        </button>
      </div>

      {/* Secondary Tiles - Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => togglePanel("requests")}
          className={`rounded-xl border-2 p-4 text-left shadow-sm transition-all hover:shadow-md ${
            activePanel === "requests" 
              ? "border-amber-500 bg-amber-50" 
              : "border-transparent bg-white hover:border-amber-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <FileCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Activations</p>
              <p className="text-sm text-gray-500">
                {pendingRequestCount} pending / {activationRequests.length} total
              </p>
            </div>
          </div>
        </button>

        <Link
          href="/admin/fundraising/wallets"
          className="rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-[#D3B574] hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#D3B574]/20 p-2">
              <Wallet className="h-5 w-5 text-[#D3B574]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Family Wallets</p>
              <p className="text-sm text-gray-500">Balances & parent links</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        </Link>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2">
              <Link2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Parent Links</p>
              <p className="text-sm text-gray-500">
                {linkedAthletesCount} connected / {activeProfileCount} active
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-100 p-2">
              <Eye className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Page Views</p>
              <p className="text-sm text-gray-500">
                {totalPageViews.toLocaleString()} last 30 days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Tiles - Row 2 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/expense-requests"
          className="rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Expense Requests</p>
              <p className="text-sm text-gray-500">Review & approve</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/admin/fundraising-ledger"
          className="rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Full Ledger</p>
              <p className="text-sm text-gray-500">Export for accountant</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/admin/fundraising/activation-requests"
          className="rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-amber-200 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <FileCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Review Activations</p>
              <p className="text-sm text-gray-500">Approve/reject pages</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        </Link>
      </div>

      {/* Expanded Panel - Donations */}
      {activePanel === "donations" && (
        <div className="rounded-xl border-2 border-green-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-gray-900">All Donations ({filteredDonations.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search donor, athlete, campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-80"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Athlete</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDonations.slice(0, 100).map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmtDate(d.createdIso)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.donorDisplay}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900">{d.athleteCredit}</p>
                        {d.athleteCode && <p className="text-xs text-gray-500">{d.athleteCode}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.campaignNameLabel}</td>
                    <td className="px-4 py-3 text-gray-500">{d.giftSourceLabel}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">
                      {fmtCents(d.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDonations.length > 100 && (
              <p className="mt-4 text-center text-sm text-gray-500">
                Showing 100 of {filteredDonations.length} donations
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expanded Panel - Reimbursements */}
      {activePanel === "reimbursements" && (
        <div className="rounded-xl border-2 border-red-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-gray-900">All Reimbursements ({filteredExpenses.length})</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search athlete, parent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Athlete</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {fmtDate(e.paid_at || e.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {e.athlete_first_name} {e.athlete_last_name}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900">{e.parent_name || "—"}</p>
                        {e.parent_email && <p className="text-xs text-gray-500">{e.parent_email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.expense_type || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-700">
                      {fmtCents(e.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Panel - Activation Requests */}
      {activePanel === "requests" && (
        <div className="rounded-xl border-2 border-amber-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-gray-900">Activation Requests ({filteredRequests.length})</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search athlete, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Athlete</th>
                  <th className="px-4 py-3">Page Slug</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.athlete_first_name} {r.athlete_last_name}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">{r.fundraising_slug}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.requester_email || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <Link
                          href="/admin/fundraising/activation-requests"
                          className="text-sm font-medium text-amber-600 hover:text-amber-800"
                        >
                          Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Panel - Active Profiles */}
      {activePanel === "profiles" && (
        <div className="rounded-xl border-2 border-purple-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-gray-900">Active Fundraising Pages ({filteredProfiles.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search athlete, slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:w-80"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">Athlete</th>
                  <th className="px-4 py-3">Page Slug</th>
                  <th className="px-4 py-3">Raised</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Views (30d)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProfiles.map((p) => {
                  const progress = p.campaign_goal_cents > 0 
                    ? Math.min(100, Math.round((p.total_raised_cents / p.campaign_goal_cents) * 100))
                    : 0
                  const athleteName = `${p.athlete_first_name || ""} ${p.athlete_last_name || ""}`.trim() || "Athlete"
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setWalletPreview({ athleteId: p.athlete_id, athleteName })}
                          className="flex items-center gap-2 font-medium text-gray-900 hover:text-purple-700 transition-colors"
                        >
                          <Wallet className="h-4 w-4 text-[#D3B574]" />
                          {athleteName}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">{p.slug}</code>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">
                        {fmtCents(p.total_raised_cents)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtCents(p.campaign_goal_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div 
                              className="h-2 rounded-full bg-purple-500" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{p.page_views_30d.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.checkout_live ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" /> Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <Clock className="h-4 w-4" /> Paused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/fundraising/athletes/${p.slug}`}
                          target="_blank"
                          className="text-sm font-medium text-purple-600 hover:text-purple-800"
                        >
                          View Page
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet Preview Modal */}
      {walletPreview && (
        <WalletPreviewModal
          athleteId={walletPreview.athleteId}
          athleteName={walletPreview.athleteName}
          onClose={() => setWalletPreview(null)}
        />
      )}
    </div>
  )
}
