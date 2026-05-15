"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Shield,
  ShoppingBag,
  CreditCard,
  Heart,
  Award,
  MessageSquare,
  Clipboard,
  ExternalLink,
} from "lucide-react"
import { AthleteImage } from "@/components/athlete-image"
import { ContactMessagingTab } from "@/app/admin/athletes/edit/contact-messaging-tab"
import { ContactActivityTab } from "@/app/admin/athletes/edit/contact-activity-tab"

type ParentProfile = {
  user_id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  cell_phone: string | null
  profile_image_url: string | null
  headshot_url: string | null
  profile_type: string | null
  created_at: string | null
  last_login_at: string | null
  is_admin: boolean
  bio: string | null
  location: string | null
}

type LinkedAthlete = {
  id: string
  name: string
  photourl: string | null
  graduationyear: number | null
  weightclass: string | null
  highschool: string | null
}

type AuthInfo = {
  id: string
  email: string | null
  phone: string | null
  createdAt: string | null
  lastSignInAt: string | null
  confirmedAt: string | null
  isAnonymous: boolean
}

type LoginHistoryEntry = {
  timestamp: string
  method: string | null
  ip: string | null
  userAgent: string | null
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatTimeAgo(date: string | null | undefined): string {
  if (!date) return "Never"
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: any
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[#C8A94A]" />
          <span className="font-semibold text-white">{title}</span>
          {count !== undefined && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-white/40" />
        ) : (
          <ChevronDown className="h-5 w-5 text-white/40" />
        )}
      </button>
      {open && <div className="border-t border-white/10 p-4">{children}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    paid: "bg-emerald-500/20 text-emerald-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
    rejected: "bg-red-500/20 text-red-400",
    denied: "bg-red-500/20 text-red-400",
  }
  const color = colors[status.toLowerCase()] || "bg-white/10 text-white/60"
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-sm text-white/40 py-4">{message}</p>
}

export default function ParentContactPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<ParentProfile | null>(null)
  const [linkedAthletes, setLinkedAthletes] = useState<LinkedAthlete[]>([])
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [crmData, setCrmData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch parent profile data
        const res = await fetch(`/api/admin/contacts/parent/${resolvedParams.userId}`, { credentials: "include" })
        const data = await res.json()

        if (res.ok && data.success) {
          setProfile(data.profile)
          setLinkedAthletes(data.linkedAthletes || [])
          setAuthInfo(data.auth || null)
          setLoginHistory(data.loginHistory || [])
        }

        // Fetch CRM hub data
        const crmRes = await fetch(`/api/admin/crm/users/${resolvedParams.userId}`, { credentials: "include" })
        const crmResult = await crmRes.json().catch(() => ({}))
        if (crmRes.ok && crmResult) {
          setCrmData(crmResult)
        }
      } catch (e) {
        console.error("[v0] Failed to fetch parent data:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.userId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061224]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#C8A94A] border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#061224] px-4">
        <p className="text-lg text-white/70">Parent not found</p>
        <Link href="/admin/contacts" className="mt-4 text-[#C8A94A] hover:underline">
          Back to Contacts
        </Link>
      </div>
    )
  }

  const displayName =
    profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown Parent"
  const photoUrl = profile.profile_image_url || profile.headshot_url

  // Extract CRM data
  const orders = crmData?.orders?.ok ? crmData.orders.data?.rows || [] : []
  const memberships = crmData?.blueMemberships?.ok ? crmData.blueMemberships.data || [] : []
  const nationalTeam = crmData?.nationalTeamRegistrations?.ok ? crmData.nationalTeamRegistrations.data || [] : []
  const dropIns = crmData?.dropInRequests?.ok ? crmData.dropInRequests.data || [] : []
  const signups = crmData?.blueSignups?.ok ? crmData.blueSignups.data || [] : []
  const fundraising = crmData?.fundraisingWallet?.ok ? crmData.fundraisingWallet.data?.athletes || [] : []
  const expenses = crmData?.athleteExpenseRequests?.ok ? crmData.athleteExpenseRequests.data || [] : []

  return (
    <div className="min-h-screen bg-[#061224]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#061224]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-6">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/10">
              {photoUrl ? (
                <AthleteImage photoUrl={photoUrl} name={displayName} fill alt={displayName} className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/50">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                  Parent
                </span>
                {profile.is_admin && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    Admin
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/60">
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-[#C8A94A]">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </a>
                )}
                {profile.cell_phone && (
                  <a href={`tel:${profile.cell_phone}`} className="flex items-center gap-1 hover:text-[#C8A94A]">
                    <Phone className="h-4 w-4" />
                    {profile.cell_phone}
                  </a>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(profile.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Last login {formatTimeAgo(profile.last_login_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Athletes */}
        <CollapsibleSection
          title="Linked Athletes"
          icon={Users}
          count={linkedAthletes.length}
          defaultOpen={linkedAthletes.length > 0}
        >
          {linkedAthletes.length === 0 ? (
            <EmptyState message="No linked athletes" />
          ) : (
            <div className="space-y-2">
              {linkedAthletes.map((athlete) => (
                <Link
                  key={athlete.id}
                  href={`/admin/athletes/edit?id=${athlete.id}`}
                  className="flex items-center gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                    {athlete.photourl ? (
                      <AthleteImage
                        photoUrl={athlete.photourl}
                        name={athlete.name}
                        fill
                        alt={athlete.name}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/50">
                        {athlete.name?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{athlete.name}</p>
                    <p className="text-xs text-white/50">
                      {[athlete.graduationyear, athlete.weightclass && `${athlete.weightclass} lbs`, athlete.highschool]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/30" />
                </Link>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Auth & Login History */}
        <CollapsibleSection
          title="Authentication & Login History"
          icon={Shield}
          count={loginHistory.length}
          defaultOpen={true}
        >
          {authInfo && (
            <div className="mb-4 rounded-lg bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-3">Account Details</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/50">Auth Email</p>
                  <p className="font-medium text-white">{authInfo.email || "—"}</p>
                </div>
                <div>
                  <p className="text-white/50">Auth Phone</p>
                  <p className="font-medium text-white">{authInfo.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-white/50">Account Created</p>
                  <p className="font-medium text-white">{formatDateTime(authInfo.createdAt)}</p>
                </div>
                <div>
                  <p className="text-white/50">Last Sign In</p>
                  <p className="font-medium text-white">{formatDateTime(authInfo.lastSignInAt)}</p>
                </div>
                <div>
                  <p className="text-white/50">Email Confirmed</p>
                  <p className="font-medium text-white">{formatDateTime(authInfo.confirmedAt)}</p>
                </div>
                <div>
                  <p className="text-white/50">Anonymous</p>
                  <p className="font-medium text-white">{authInfo.isAnonymous ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}

          {loginHistory.length === 0 ? (
            <EmptyState message="No login history available" />
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">
                Recent Logins ({loginHistory.length})
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {loginHistory.slice(0, 20).map((entry, idx) => (
                  <div key={idx} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{formatDateTime(entry.timestamp)}</span>
                      {entry.method && (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">{entry.method}</span>
                      )}
                    </div>
                    {entry.userAgent && (
                      <p className="mt-1 text-xs text-white/40 truncate">{entry.userAgent}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Orders */}
        <CollapsibleSection title="Orders" icon={ShoppingBag} count={orders.length}>
          {orders.length === 0 ? (
            <EmptyState message="No orders" />
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 10).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{formatCurrency((order.total || 0) * 100)}</p>
                    <p className="text-xs text-white/50">
                      {order.channel || "Store"} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Blue Memberships */}
        <CollapsibleSection title="Blue Memberships" icon={Award} count={memberships.length}>
          {memberships.length === 0 ? (
            <EmptyState message="No memberships" />
          ) : (
            <div className="space-y-2">
              {memberships.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">Blue Membership</p>
                    <p className="text-xs text-white/50">
                      Started {formatDate(m.started_at)} · Next billing {formatDate(m.next_billing_at)}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Fundraising */}
        <CollapsibleSection title="Fundraising" icon={Heart} count={fundraising.length + expenses.length}>
          {fundraising.length === 0 && expenses.length === 0 ? (
            <EmptyState message="No fundraising activity" />
          ) : (
            <div className="space-y-4">
              {fundraising.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Digital Wallets</p>
                  {fundraising.map((f: any) => (
                    <div key={f.athleteId} className="rounded-lg bg-white/5 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                          {f.firstName} {f.lastName}
                        </p>
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
              )}

              {expenses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-2">Expense Requests</p>
                  {expenses.slice(0, 5).map((e: any) => (
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
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* National Team / Events */}
        <CollapsibleSection title="Events & Registrations" icon={Clipboard} count={nationalTeam.length + dropIns.length}>
          {nationalTeam.length === 0 && dropIns.length === 0 ? (
            <EmptyState message="No event registrations" />
          ) : (
            <div className="space-y-2">
              {nationalTeam.map((reg: any) => (
                <div key={reg.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{reg.event_slug || "National Team"}</p>
                    <p className="text-xs text-white/50">{formatDate(reg.created_at)}</p>
                  </div>
                  <StatusBadge status={reg.status} />
                </div>
              ))}
              {dropIns.map((di: any) => (
                <div key={di.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">Drop-in: {di.wrestler_name}</p>
                    <p className="text-xs text-white/50">{formatDate(di.created_at)}</p>
                  </div>
                  <StatusBadge status={di.payment_status} />
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Messaging Section */}
        {profile && (profile.email || profile.cell_phone) && (
          <div className="mt-8">
            <ContactMessagingTab
              contactId={resolvedParams.userId}
              contactType="parent"
              contactName={profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Parent"}
              contactEmail={profile.email}
              contactPhone={profile.cell_phone}
            />
          </div>
        )}

        {/* Activity & Logins Section */}
        <div className="mt-8">
          <ContactActivityTab userId={resolvedParams.userId} />
        </div>
      </main>
    </div>
  )
}
