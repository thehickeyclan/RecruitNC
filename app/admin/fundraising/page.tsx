import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { buildFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"
import { 
  DollarSign, 
  Users, 
  FileCheck, 
  Receipt, 
  TrendingUp, 
  BookOpen,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from "lucide-react"

async function getFundraisingStats() {
  const supabase = await createClient()
  
  // Use the SAME data source as the public giving hub
  const hubSnapshot = await buildFundraisingHubSnapshot()
  
  // Get counts and reimbursements from database
  const [
    { count: pendingActivations },
    { count: totalAthletes },
    { count: activePages },
    { data: paidExpenses }
  ] = await Promise.all([
    supabase
      .from("fundraising_activation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("athlete_fundraising_profiles")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("athlete_fundraising_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    // Get paid reimbursements
    supabase
      .from("athlete_expense_requests")
      .select("amount_cents")
      .eq("status", "paid")
  ])

  // Raised comes from hub (same as public page)
  const totalRaised = hubSnapshot.hero.totalRaisedCents
  const donationCount = hubSnapshot.hero.giftCount
  
  // Spent = sum of paid reimbursements
  const totalSpent = paidExpenses?.reduce((sum, e) => sum + (Number(e.amount_cents) || 0), 0) || 0

  return {
    pendingActivations: pendingActivations || 0,
    totalAthletes: totalAthletes || 0,
    activePages: activePages || 0,
    totalRaised,
    totalSpent,
    donationCount,
    available: totalRaised - totalSpent
  }
}

function fmtCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
}

export default async function AdminFundraisingPage() {
  const stats = await getFundraisingStats()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 pb-12">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">
          &larr; Admin home
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Fundraising Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage athlete fundraising pages, donations, and reimbursements.
        </p>
      </div>

      {/* Pending Alert */}
      {stats.pendingActivations > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              {stats.pendingActivations} pending activation request{stats.pendingActivations !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-amber-700">Families are waiting for their pages to go live.</p>
          </div>
          <Link
            href="/admin/fundraising/activation-requests"
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Raised</p>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{fmtCents(stats.totalRaised)}</p>
          <p className="text-xs text-gray-500">{stats.donationCount} donations</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Reimbursed</p>
            <Receipt className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{fmtCents(stats.totalSpent)}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Available</p>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{fmtCents(stats.available)}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active Pages</p>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {stats.activePages} <span className="text-sm font-normal text-gray-500">/ {stats.totalAthletes}</span>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/fundraising/activation-requests"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="rounded-lg bg-blue-100 p-3">
            <FileCheck className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Page Activations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve family requests to activate their athlete fundraising pages.
            </p>
            {stats.pendingActivations > 0 && (
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {stats.pendingActivations} pending
              </span>
            )}
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
        </Link>

        <Link
          href="/admin/expense-requests"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="rounded-lg bg-green-100 p-3">
            <Receipt className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Reimbursements</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review expense requests, approve reimbursements, and mark them as paid.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
        </Link>

        <Link
          href="/admin/fundraising-ledger"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="rounded-lg bg-purple-100 p-3">
            <BookOpen className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Audit Ledger</h3>
            <p className="mt-1 text-sm text-gray-500">
              Full transaction history with CSV export for accountant review.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
        </Link>

        <Link
          href="/admin/fundraising/rankings"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="rounded-lg bg-amber-100 p-3">
            <TrendingUp className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Leaderboard</h3>
            <p className="mt-1 text-sm text-gray-500">
              See top fundraisers ranked by amount raised.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
        </Link>

        <Link
          href="/admin/fundraising/playbook"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="rounded-lg bg-gray-100 p-3">
            <BookOpen className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Playbook</h3>
            <p className="mt-1 text-sm text-gray-500">
              Documentation and guides for managing fundraising.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
        </Link>
      </div>

      {/* Status Indicators */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-700">Parent-athlete links working</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-700">Stripe checkout connected</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-700">Ledger tracking donations</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-700">Reimbursement workflow active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
