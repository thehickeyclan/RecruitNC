"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Package, CreditCard, Users, Heart, User, Calendar, Clock, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type GiftRow = {
  created_at: string
  donorLabel: string
  amountCents: number
  campaignLabel: string
}

type AthleteFundraisingData = {
  profile: {
    slug: string
    checkout_live: boolean
    campaign_goal_cents: number | null
    total_raised_cents: number | null
  } | null
  fundraisingCode: string | null
  athleteSlug: string | null
  fundraisingPageUrl: string | null
  stats: {
    raisedCents: number
    giftCount: number
    avgGiftCents: number | null
  } | null
  wallet: {
    raisedCents: number
    spentCents: number
    reservedCents: number
    availableCents: number
  } | null
  gifts: GiftRow[]
  expenseRequests: ExpenseRequestRow[]
}

type CrmHistoryData = {
  orders?: { rows: OrderRow[]; note?: string }
  blueMemberships?: BlueMembershipRow[]
  nationalTeamRegistrations?: NationalTeamRow[]
  dropInRequests?: DropInRow[]
  blueSignups?: BlueSignupRow[]
  fundraisingWallet?: {
    campaign: string
    lookbackDays: number
    athletes: FundraisingAthleteRow[]
  }
  athleteExpenseRequests?: ExpenseRequestRow[]
  auth?: AuthSummary | null
  profile?: Record<string, unknown> | null
}

type OrderRow = {
  id: string
  created_at: string | null
  total: number | null
  status: string | null
  channel: string | null
  customer_email: string | null
}

type BlueMembershipRow = {
  id: string
  athlete_id: string | null
  status: string | null
  started_at: string | null
  ended_at: string | null
  next_billing_at: string | null
}

type NationalTeamRow = {
  id: string
  event_slug: string | null
  status: string | null
  created_at: string | null
}

type DropInRow = {
  id: string
  payment_status: string | null
  created_at: string | null
  wrestler_name: string | null
}

type BlueSignupRow = {
  id: string
  status: string | null
  created_at: string | null
}

type FundraisingAthleteRow = {
  athleteId: string
  code: string
  firstName: string
  lastName: string
  raisedCents: number
  spentCents: number
  reservedCents: number
  availableCents: number
}

type ExpenseRequestRow = {
  id: string
  athlete_name: string | null
  expense_type: string | null
  amount_cents: number
  status: string | null
  created_at: string | null
}

type AuthSummary = {
  email: string | null
  createdAt: string | null
  lastSignInAt: string | null
  confirmedAt: string | null
}

type Props = {
  data: CrmHistoryData
  linkedUserId?: string | null
  athleteFundraising?: AthleteFundraisingData | null
}

function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "$0"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || "unknown").toLowerCase()
  let colorClass = "bg-white/10 text-white/70"
  let Icon = AlertCircle

  if (s === "active" || s === "paid" || s === "completed" || s === "approved") {
    colorClass = "bg-emerald-500/20 text-emerald-400"
    Icon = CheckCircle
  } else if (s === "cancelled" || s === "failed" || s === "rejected" || s === "expired") {
    colorClass = "bg-red-500/20 text-red-400"
    Icon = XCircle
  } else if (s === "pending" || s === "processing") {
    colorClass = "bg-amber-500/20 text-amber-400"
    Icon = Clock
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {status || "Unknown"}
    </span>
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left min-h-[56px] touch-manipulation hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8A94A]/20">
            <Icon className="h-5 w-5 text-[#C8A94A]" />
          </div>
          <div>
            <span className="font-semibold text-white">{title}</span>
            <span className="ml-2 text-sm text-white/50">({count})</span>
          </div>
        </div>
        {open ? <ChevronDown className="h-5 w-5 text-white/50" /> : <ChevronRight className="h-5 w-5 text-white/50" />}
      </button>
      {open && <div className="border-t border-white/10 px-4 py-3">{children}</div>}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-4 text-center text-sm text-white/40">{message}</p>
}

export function ContactCrmHistory({ data, linkedUserId, athleteFundraising }: Props) {
  const orders = data.orders?.rows || []
  const memberships = data.blueMemberships || []
  const nationalTeam = data.nationalTeamRegistrations || []
  const dropIns = data.dropInRequests || []
  const signups = data.blueSignups || []
  const fundraising = data.fundraisingWallet?.athletes || []
  const expenses = data.athleteExpenseRequests || []
  const auth = data.auth
  const profile = data.profile

  // Athlete-specific fundraising data
  const athFund = athleteFundraising
  const gifts = athFund?.gifts || []
  const athExpenses = athFund?.expenseRequests || []

  // Calculate subscription count (all programs)
  const subscriptionCount = memberships.length + nationalTeam.length + dropIns.length + signups.length
  
  // Calculate fundraising count
  const fundraisingCount = (athFund ? 1 : 0) + gifts.length + athExpenses.length

  return (
    <div className="space-y-4">
      {/* Account Info Section */}
      <CollapsibleSection title="Account" icon={User} count={auth ? 1 : 0} defaultOpen={true}>
        {auth ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/50">Email</p>
                <p className="font-medium text-white">{auth.email || "—"}</p>
              </div>
              <div>
                <p className="text-white/50">Confirmed</p>
                <p className="font-medium text-white">{auth.confirmedAt ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-white/50">Created</p>
                <p className="font-medium text-white">{formatDate(auth.createdAt)}</p>
              </div>
              <div>
                <p className="text-white/50">Last Login</p>
                <p className="font-medium text-white">{formatDate(auth.lastSignInAt)}</p>
              </div>
            </div>
            {profile && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 mb-2">Profile Details</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/50">Role</p>
                    <p className="font-medium text-white">{(profile.role as string) || "—"}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Phone</p>
                    <p className="font-medium text-white">{(profile.cell_phone as string) || "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : linkedUserId ? (
          <EmptyState message="No linked user account found" />
        ) : (
          <EmptyState message="Athlete not linked to a user account" />
        )}
      </CollapsibleSection>

      {/* Subscriptions & Programs Section */}
      <CollapsibleSection title="Subscriptions & Programs" icon={CreditCard} count={subscriptionCount}>
        {subscriptionCount === 0 ? (
          <EmptyState message="No subscriptions or program registrations" />
        ) : (
          <div className="space-y-4">
            {/* NC United Blue Memberships */}
            {memberships.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">NC United Blue</p>
                <div className="space-y-2">
                  {memberships.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <StatusBadge status={m.status} />
                        <p className="mt-1 text-xs text-white/50">
                          Started {formatDate(m.started_at)}
                          {m.ended_at && ` · Ended ${formatDate(m.ended_at)}`}
                        </p>
                      </div>
                      {m.next_billing_at && (
                        <p className="text-xs text-white/50">Next bill: {formatDate(m.next_billing_at)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* National Team Registrations */}
            {nationalTeam.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">National Team</p>
                <div className="space-y-2">
                  {nationalTeam.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{r.event_slug || "Event"}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-xs text-white/50">{formatDate(r.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drop-ins */}
            {dropIns.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Drop-in Sessions</p>
                <div className="space-y-2">
                  {dropIns.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{d.wrestler_name || "Session"}</p>
                        <StatusBadge status={d.payment_status} />
                      </div>
                      <p className="text-xs text-white/50">{formatDate(d.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blue Signups (incomplete) */}
            {signups.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Signup Attempts</p>
                <div className="space-y-2">
                  {signups.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <StatusBadge status={s.status} />
                      <p className="text-xs text-white/50">{formatDate(s.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Orders Section */}
      <CollapsibleSection title="Orders & Purchases" icon={Package} count={orders.length}>
        {orders.length === 0 ? (
          <EmptyState message="No orders found" />
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 10).map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{formatCurrency(order.total ? order.total * 100 : 0)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {order.channel || "Store"} · {formatDate(order.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {orders.length > 10 && (
              <p className="text-center text-xs text-white/40 pt-2">+ {orders.length - 10} more orders</p>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Fundraising Section */}
      <CollapsibleSection title="Fundraising" icon={Heart} count={fundraisingCount} defaultOpen={!!athFund}>
        {!athFund && fundraising.length === 0 && expenses.length === 0 ? (
          <EmptyState message="No fundraising activity" />
        ) : (
          <div className="space-y-4">
            {/* Athlete Fundraising Summary */}
            {athFund && (
              <div>
                {/* Link to Fundraising Page */}
                {athFund.fundraisingPageUrl && (
                  <a
                    href={athFund.fundraisingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 flex items-center justify-between rounded-lg bg-[#C8A94A]/20 px-4 py-3 hover:bg-[#C8A94A]/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-[#C8A94A]" />
                      <span className="font-medium text-white">View Fundraising Page</span>
                    </div>
                    <span className="text-xs text-white/60">{athFund.fundraisingCode || athFund.athleteSlug}</span>
                  </a>
                )}

                {/* Wallet Summary */}
                {athFund.wallet && (
                  <div className="rounded-lg bg-white/5 px-4 py-4 mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-3">Digital Wallet</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-white/50 text-xs">Total Raised</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(athFund.stats?.raisedCents || athFund.wallet.raisedCents)}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">Available</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(athFund.wallet.availableCents)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs border-t border-white/10 pt-3">
                      <div>
                        <p className="text-white/50">Gifts</p>
                        <p className="font-medium text-white">{athFund.stats?.giftCount || gifts.length}</p>
                      </div>
                      <div>
                        <p className="text-white/50">Spent</p>
                        <p className="font-medium text-white">{formatCurrency(athFund.wallet.spentCents)}</p>
                      </div>
                      <div>
                        <p className="text-white/50">Reserved</p>
                        <p className="font-medium text-white">{formatCurrency(athFund.wallet.reservedCents)}</p>
                      </div>
                    </div>
                    {athFund.profile?.campaign_goal_cents && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/50">Goal Progress</span>
                          <span className="text-white/70">{Math.round(((athFund.stats?.raisedCents || 0) / athFund.profile.campaign_goal_cents) * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-[#C8A94A]" 
                            style={{ width: `${Math.min(100, ((athFund.stats?.raisedCents || 0) / athFund.profile.campaign_goal_cents) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-white/50">Goal: {formatCurrency(athFund.profile.campaign_goal_cents)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Donations */}
                {gifts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Recent Donations ({gifts.length})</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {gifts.slice(0, 20).map((gift, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-white">{gift.donorLabel}</p>
                            <p className="text-xs text-white/50">{gift.campaignLabel} · {formatDate(gift.created_at)}</p>
                          </div>
                          <p className="text-sm font-semibold text-emerald-400">{formatCurrency(gift.amountCents)}</p>
                        </div>
                      ))}
                    </div>
                    {gifts.length > 20 && (
                      <p className="text-center text-xs text-white/40 pt-2">+ {gifts.length - 20} more donations</p>
                    )}
                  </div>
                )}

                {/* Expense Requests (Athlete-specific) */}
                {athExpenses.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Expense Requests</p>
                    <div className="space-y-2">
                      {athExpenses.slice(0, 5).map((e) => (
                        <div key={e.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{formatCurrency(e.amount_cents)}</p>
                              <StatusBadge status={e.status} />
                            </div>
                            <p className="mt-1 text-xs text-white/50">
                              {e.expense_type || "Expense"} · {formatDate(e.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Legacy/User-based Fundraising Wallets (from CRM hub) */}
            {!athFund && fundraising.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Digital Wallets</p>
                <div className="space-y-2">
                  {fundraising.map((f) => (
                    <div key={f.athleteId} className="rounded-lg bg-white/5 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{f.firstName} {f.lastName}</p>
                        <p className="text-sm font-semibold text-emerald-400">{formatCurrency(f.availableCents)}</p>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-white/50">Raised</p>
                          <p className="font-medium text-white">{formatCurrency(f.raisedCents)}</p>
                        </div>
                        <div>
                          <p className="text-white/50">Spent</p>
                          <p className="font-medium text-white">{formatCurrency(f.spentCents)}</p>
                        </div>
                        <div>
                          <p className="text-white/50">Reserved</p>
                          <p className="font-medium text-white">{formatCurrency(f.reservedCents)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Expense Requests (from CRM hub) */}
            {!athFund && expenses.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Expense Requests</p>
                <div className="space-y-2">
                  {expenses.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{formatCurrency(e.amount_cents)}</p>
                          <StatusBadge status={e.status} />
                        </div>
                        <p className="mt-1 text-xs text-white/50">
                          {e.expense_type || "Expense"} · {formatDate(e.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}
