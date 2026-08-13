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
  Building2,
  ChevronDown,
  ChevronUp,
  Shield,
  Star,
  Users,
  Activity,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { AthleteImage } from "@/components/athlete-image"
import { ContactMessagingTab } from "@/app/admin/athletes/edit/contact-messaging-tab"
import { ContactActivityTab } from "@/app/admin/athletes/edit/contact-activity-tab"

type CoachProfile = {
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
  institution: string | null
  coaching_position: string | null
  coaching_experience: string | null
  coaching_philosophy: string | null
  verified_coach: boolean
  verified_at: string | null
  verified_by: string | null
  verification_status: string | null
  verification_requested_at: string | null
  school_id: string | null
  bio: string | null
  location: string | null
}

type StarredAthlete = {
  id: string
  athlete_id: string
  athlete_name: string | null
  athlete_photo: string | null
  athlete_grad_year: number | null
  athlete_weight: string | null
  athlete_school: string | null
  starred_at: string | null
  pipeline_stage: string | null
  star_rating: number | null
  last_contacted: string | null
}

type RecruitingActivity = {
  id: string
  action_type: string
  description: string | null
  athlete_id: string
  athlete_name: string | null
  created_at: string
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

function VerificationBadge({ status, verified }: { status: string | null; verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle className="h-3.5 w-3.5" />
        Verified
      </span>
    )
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">
        <AlertCircle className="h-3.5 w-3.5" />
        Pending
      </span>
    )
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/50">
      Not Verified
    </span>
  )
}

function PipelineBadge({ stage }: { stage: string | null }) {
  if (!stage) return null
  const colors: Record<string, string> = {
    prospect: "bg-blue-500/20 text-blue-400",
    contacted: "bg-purple-500/20 text-purple-400",
    interested: "bg-amber-500/20 text-amber-400",
    visit_scheduled: "bg-cyan-500/20 text-cyan-400",
    visited: "bg-teal-500/20 text-teal-400",
    offered: "bg-emerald-500/20 text-emerald-400",
    committed: "bg-green-500/20 text-green-400",
    signed: "bg-green-600/20 text-green-300",
    not_interested: "bg-red-500/20 text-red-400",
  }
  const color = colors[stage.toLowerCase().replace(/ /g, "_")] || "bg-white/10 text-white/60"
  const label = stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${n <= rating ? "fill-[#C8A94A] text-[#C8A94A]" : "text-white/20"}`}
        />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-sm text-white/40 py-4">{message}</p>
}

export default function CoachContactPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [starredAthletes, setStarredAthletes] = useState<StarredAthlete[]>([])
  const [activities, setActivities] = useState<RecruitingActivity[]>([])
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/contacts/coach/${resolvedParams.userId}`, { credentials: "include" })
        const data = await res.json()

        if (res.ok && data.success) {
          setProfile(data.profile)
          setStarredAthletes(data.starredAthletes || [])
          setActivities(data.activities || [])
          setAuthInfo(data.auth || null)
          setLoginHistory(data.loginHistory || [])
        }
      } catch (e) {
        console.error("[v0] Failed to fetch coach data:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.userId])

  if (loading) {
    return (
      <div className="admin-dark-page flex min-h-screen items-center justify-center bg-[#061224]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#C8A94A] border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="admin-dark-page flex min-h-screen flex-col items-center justify-center bg-[#061224] px-4">
        <p className="text-lg text-white/70">Coach not found</p>
        <Link href="/admin/contacts" className="mt-4 text-[#C8A94A] hover:underline">
          Back to Contacts
        </Link>
      </div>
    )
  }

  const displayName =
    profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown Coach"
  const photoUrl = profile.profile_image_url || profile.headshot_url

  return (
    <div className="admin-dark-page min-h-screen bg-[#061224]">
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
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Coach
                </span>
                <VerificationBadge status={profile.verification_status} verified={profile.verified_coach} />
                {profile.is_admin && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    Admin
                  </span>
                )}
              </div>

              {/* Institution & Position */}
              {(profile.institution || profile.coaching_position) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                  <Building2 className="h-4 w-4 text-white/40" />
                  <span>
                    {profile.coaching_position && <span>{profile.coaching_position}</span>}
                    {profile.coaching_position && profile.institution && <span> at </span>}
                    {profile.institution && <span className="font-medium">{profile.institution}</span>}
                  </span>
                </div>
              )}

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

          {/* Bio / Philosophy */}
          {(profile.bio || profile.coaching_philosophy) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              {profile.bio && (
                <p className="text-sm text-white/70">{profile.bio}</p>
              )}
              {profile.coaching_philosophy && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-white/40 uppercase">Coaching Philosophy</p>
                  <p className="mt-1 text-sm text-white/60">{profile.coaching_philosophy}</p>
                </div>
              )}
            </div>
          )}
        </div>

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

        {/* Starred Athletes */}
        <CollapsibleSection
          title="Starred Athletes"
          icon={Star}
          count={starredAthletes.length}
          defaultOpen={starredAthletes.length > 0}
        >
          {starredAthletes.length === 0 ? (
            <EmptyState message="No starred athletes" />
          ) : (
            <div className="space-y-2">
              {starredAthletes.map((star) => (
                <Link
                  key={star.id}
                  href={`/admin/athletes/edit?id=${star.athlete_id}`}
                  className="flex items-center gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                    {star.athlete_photo ? (
                      <AthleteImage
                        photoUrl={star.athlete_photo}
                        name={star.athlete_name || ""}
                        fill
                        alt={star.athlete_name || ""}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/50">
                        {star.athlete_name?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{star.athlete_name || "Unknown"}</p>
                      <StarRating rating={star.star_rating} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-white/50">
                        {[star.athlete_grad_year, star.athlete_weight, star.athlete_school]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <PipelineBadge stage={star.pipeline_stage} />
                    </div>
                    {star.last_contacted && (
                      <p className="mt-1 text-xs text-white/40">
                        Last contacted: {formatDate(star.last_contacted)}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/30" />
                </Link>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Recruiting Activity */}
        <CollapsibleSection
          title="Recruiting Activity"
          icon={Activity}
          count={activities.length}
          defaultOpen={activities.length > 0 && activities.length < 10}
        >
          {activities.length === 0 ? (
            <EmptyState message="No recruiting activity" />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {activity.action_type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-xs text-white/40">{formatDate(activity.created_at)}</span>
                  </div>
                  {activity.athlete_name && (
                    <p className="mt-1 text-xs text-white/60">Athlete: {activity.athlete_name}</p>
                  )}
                  {activity.description && (
                    <p className="mt-1 text-xs text-white/50">{activity.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Verification Details */}
        {(profile.verification_requested_at || profile.verified_at) && (
          <CollapsibleSection title="Verification History" icon={CheckCircle} defaultOpen={false}>
            <div className="space-y-3 text-sm">
              {profile.verification_requested_at && (
                <div className="flex justify-between">
                  <span className="text-white/50">Verification Requested</span>
                  <span className="text-white">{formatDateTime(profile.verification_requested_at)}</span>
                </div>
              )}
              {profile.verified_at && (
                <div className="flex justify-between">
                  <span className="text-white/50">Verified At</span>
                  <span className="text-white">{formatDateTime(profile.verified_at)}</span>
                </div>
              )}
              {profile.verification_status && (
                <div className="flex justify-between">
                  <span className="text-white/50">Status</span>
                  <span className="text-white capitalize">{profile.verification_status}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Messaging Section */}
        {profile && (profile.email || profile.cell_phone) && (
          <div className="mt-8">
            <ContactMessagingTab
              contactId={resolvedParams.userId}
              contactType="coach"
              contactName={profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Coach"}
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
