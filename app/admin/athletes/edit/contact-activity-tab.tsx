"use client"

import { useState, useEffect } from "react"
import { Monitor, Clock, Globe, ChevronDown, ChevronUp, Smartphone, Laptop } from "lucide-react"

type Session = {
  date: string
  pageCount: number
  firstPage: string
  lastActivity: string
  userAgent?: string
}

type PageView = {
  url: string
  timestamp: string
  referrer?: string
}

type ActivityData = {
  auth: {
    lastSignIn: string | null
    createdAt: string | null
    email: string | null
    emailConfirmedAt: string | null
  }
  profile: {
    lastLoginAt: string | null
    createdAt: string | null
  }
  sessions: Session[]
  recentPages: PageView[]
  totalPageViews: number
}

type Props = {
  userId: string | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Never"
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

function getDeviceIcon(userAgent?: string) {
  if (!userAgent) return <Monitor className="h-4 w-4" />
  const ua = userAgent.toLowerCase()
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    return <Smartphone className="h-4 w-4" />
  }
  return <Laptop className="h-4 w-4" />
}

function getDeviceLabel(userAgent?: string) {
  if (!userAgent) return "Unknown"
  const ua = userAgent.toLowerCase()
  if (ua.includes("iphone")) return "iPhone"
  if (ua.includes("android")) return "Android"
  if (ua.includes("ipad")) return "iPad"
  if (ua.includes("mac")) return "Mac"
  if (ua.includes("windows")) return "Windows"
  return "Desktop"
}

export function ContactActivityTab({ userId }: Props) {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [showAllPages, setShowAllPages] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    fetch(`/api/admin/contacts/activity?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || "Failed to load activity")
        }
      })
      .catch(err => {
        setError("Failed to fetch activity")
        console.error(err)
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (!userId) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C8A94A]/20">
            <Monitor className="h-5 w-5 text-[#C8A94A]" />
          </div>
          <h2 className="text-lg font-bold text-white">Activity & Logins</h2>
        </div>
        <p className="text-sm text-white/50">No linked user account - activity tracking unavailable</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C8A94A]/20">
            <Monitor className="h-5 w-5 text-[#C8A94A]" />
          </div>
          <h2 className="text-lg font-bold text-white">Activity & Logins</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C8A94A] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C8A94A]/20">
            <Monitor className="h-5 w-5 text-[#C8A94A]" />
          </div>
          <h2 className="text-lg font-bold text-white">Activity & Logins</h2>
        </div>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C8A94A]/20">
          <Monitor className="h-5 w-5 text-[#C8A94A]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Activity & Logins</h2>
          <p className="text-xs text-white/50">{data?.totalPageViews || 0} page views tracked</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/50 mb-1">Last Active</p>
          <p className="text-sm font-semibold text-white">
            {formatTimeAgo(data?.auth?.lastSignIn || data?.profile?.lastLoginAt)}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/50 mb-1">Account Created</p>
          <p className="text-sm font-semibold text-white">
            {formatDate(data?.auth?.createdAt)}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/50 mb-1">Total Sessions</p>
          <p className="text-sm font-semibold text-white">{data?.sessions?.length || 0}</p>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/50 mb-1">Email Confirmed</p>
          <p className="text-sm font-semibold text-white">
            {data?.auth?.emailConfirmedAt ? formatDate(data.auth.emailConfirmedAt) : "No"}
          </p>
        </div>
      </div>

      {/* Login Sessions */}
      {data?.sessions && data.sessions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-3">
            Recent Sessions ({data.sessions.length})
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.sessions.slice(0, showAllPages ? 30 : 10).map((session, idx) => (
              <div key={idx} className="rounded-lg bg-white/5">
                <button
                  onClick={() => setExpandedSession(expandedSession === session.date ? null : session.date)}
                  className="w-full flex items-center justify-between p-3 text-left min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-white/50">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{formatDate(session.date)}</p>
                      <p className="text-xs text-white/50">
                        {session.pageCount} pages · {getDeviceLabel(session.userAgent)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">{formatTimeAgo(session.lastActivity)}</span>
                    {expandedSession === session.date ? (
                      <ChevronUp className="h-4 w-4 text-white/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    )}
                  </div>
                </button>
                {expandedSession === session.date && (
                  <div className="px-3 pb-3 border-t border-white/5 pt-2">
                    <p className="text-xs text-white/50 mb-1">First page:</p>
                    <p className="text-xs text-white/70 break-all">{session.firstPage || "—"}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data.sessions.length > 10 && !showAllPages && (
            <button
              onClick={() => setShowAllPages(true)}
              className="mt-2 w-full text-center text-xs text-[#C8A94A] py-2 hover:underline"
            >
              Show all {data.sessions.length} sessions
            </button>
          )}
        </div>
      )}

      {/* Recent Pages */}
      {data?.recentPages && data.recentPages.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A] mb-3">
            Recent Page Views
          </p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {data.recentPages.slice(0, 20).map((page, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs py-1">
                <Globe className="h-3 w-3 text-white/30 shrink-0" />
                <span className="text-white/70 truncate flex-1">{page.url}</span>
                <span className="text-white/40 shrink-0">{formatTimeAgo(page.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data?.sessions || data.sessions.length === 0) && (!data?.recentPages || data.recentPages.length === 0) && (
        <p className="text-sm text-white/50 text-center py-4">No activity recorded yet</p>
      )}
    </div>
  )
}
