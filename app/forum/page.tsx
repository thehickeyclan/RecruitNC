"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { HardLink } from "@/components/hard-link"
import { MessageCircle, Users, LayoutDashboard, Search, Loader2, Lock, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { getEventName, getHubGroupForEvent } from "@/lib/national-team-events"

type LegacyDm = { id: string; name: string; unread_count?: number }
type ForumGroup = { id: string; name: string; visibility?: string; channels: { id: string; name: string }[] }
type HubEvent = { eventSlug: string; eventName: string; forumGroupId: string | null; forumChannelId: string | null }

type SidebarData = { groups: ForumGroup[]; legacyDms: LegacyDm[] }
type HubData = { allowed: boolean; events?: HubEvent[] }

export default function ForumPage() {
  const { user } = useAuth()
  const [sidebar, setSidebar] = useState<SidebarData | null>(null)
  const [hubData, setHubData] = useState<HubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"dms" | "groups" | "hubs">("groups")

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    Promise.all([
      fetch("/api/forum/sidebar", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/national-team/hub", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([sidebarRes, hubRes]) => {
        setSidebar({
          groups: sidebarRes.groups ?? [],
          legacyDms: sidebarRes.legacyDms ?? [],
        })
        setHubData({
          allowed: hubRes.allowed ?? false,
          events: hubRes.events ?? [],
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const q = searchQuery.trim().toLowerCase()
  const dms = useMemo(() => {
    const list = sidebar?.legacyDms ?? []
    return q ? list.filter((d) => d.name.toLowerCase().includes(q)) : list
  }, [sidebar?.legacyDms, q])
  const groups = useMemo(() => {
    const list = sidebar?.groups ?? []
    return q ? list.filter((g) => g.name.toLowerCase().includes(q)) : list
  }, [sidebar?.groups, q])
  const privateGroups = useMemo(() => groups.filter((g) => g.visibility !== "public"), [groups])
  const publicGroups = useMemo(() => groups.filter((g) => g.visibility === "public"), [groups])
  const hubs = useMemo(() => {
    const events = (hubData?.events ?? []).filter((e) => e.forumGroupId && e.forumChannelId)
    const byDisplayKey = new Map<string, HubEvent>()
    for (const e of events) {
      const group = getHubGroupForEvent(e.eventSlug)
      const key = group ? group.groupKey : e.eventSlug
      if (!byDisplayKey.has(key)) byDisplayKey.set(key, e)
    }
    const list = [...byDisplayKey.values()]
    return q ? list.filter((e) => {
      const group = getHubGroupForEvent(e.eventSlug)
      const displayName = group ? getEventName(group.groupKey) : e.eventName
      return displayName.toLowerCase().includes(q)
    }) : list
  }, [hubData?.events, q])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-white/90 mb-4">Sign in to use Community.</p>
        <HardLink
          href={`/auth/signin?returnTo=${encodeURIComponent("/forum")}`}
          className="inline-block px-6 py-2 rounded-lg bg-[#C8A94A] text-[#0B2545] font-semibold hover:bg-[#E2C46A]"
        >
          Sign in
        </HardLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0B2545]">
      <div className="flex-shrink-0 p-4 pb-2 space-y-3">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Community
        </h1>
        <div className="relative" id="forum-search-wrap">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" aria-hidden />
          <input
            id="forum-search"
            type="search"
            placeholder="Search messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#C8A94A]"
            aria-label="Search messages"
          />
        </div>
        <div className="flex gap-2">
          {(["groups", "dms", "hubs"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "min-h-[40px] px-4 rounded-full text-sm font-medium transition-colors touch-manipulation",
                activeFilter === filter
                  ? "bg-[#C8A94A] text-[#0B2545]"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              )}
            >
              {filter === "groups" && "Groups"}
              {filter === "dms" && "DMs"}
              {filter === "hubs" && "Hubs"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#C8A94A]" />
          </div>
        ) : (
          <>
            {activeFilter === "groups" && (
              <div className="space-y-4">
                {groups.length === 0 ? (
                  <p className="px-4 py-6 text-center text-white/50 text-sm">
                    {q ? "No groups match your search." : "No groups yet. Create one from the sidebar."}
                  </p>
                ) : (
                  <>
                    {privateGroups.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" />
                          Private groups
                        </p>
                        <ul className="space-y-0.5">
                          {privateGroups.map((group) => {
                            const ch = group.channels.find((c) => c.name === "general") ?? group.channels[0]
                            const href = ch ? `/forum/groups/${group.id}/channels/${ch.id}` : "#"
                            if (!ch) return null
                            return (
                              <li key={group.id}>
                                <HardLink
                                  href={href}
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors touch-manipulation min-h-[52px]"
                                >
                                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-white/70" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white truncate">{group.name}</p>
                                    <p className="text-xs text-white/50 truncate">Private · {group.channels.length} channel(s)</p>
                                  </div>
                                </HardLink>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                    {publicGroups.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5" />
                          Public groups
                        </p>
                        <ul className="space-y-0.5">
                          {publicGroups.map((group) => {
                            const ch = group.channels.find((c) => c.name === "general") ?? group.channels[0]
                            const href = ch ? `/forum/groups/${group.id}/channels/${ch.id}` : "#"
                            if (!ch) return null
                            return (
                              <li key={group.id}>
                                <HardLink
                                  href={href}
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors touch-manipulation min-h-[52px]"
                                >
                                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#003366]/40 flex items-center justify-center">
                                    <Globe className="w-6 h-6 text-white/70" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white truncate">{group.name}</p>
                                    <p className="text-xs text-white/50 truncate">Public · {group.channels.length} channel(s)</p>
                                  </div>
                                </HardLink>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeFilter === "dms" && (
              <ul className="space-y-0.5">
                {dms.length === 0 ? (
                  <li className="px-4 py-6 text-center text-white/50 text-sm">
                    {q ? "No DMs match your search." : "No direct messages yet. Use + in the sidebar to message someone."}
                  </li>
                ) : (
                  dms.map((dm) => {
                    const unread = dm.unread_count ?? 0
                    const hasUnread = unread > 0
                    return (
                      <li key={dm.id}>
                        <HardLink
                          href={`/forum/dm/${dm.id}`}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors touch-manipulation"
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#C8A94A]/20 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-[#C8A94A]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("font-medium text-white truncate", hasUnread && "font-bold")}>{dm.name}</p>
                            <p className="text-xs text-white/50 truncate">Direct message</p>
                          </div>
                          {hasUnread && (
                            <span className="flex-shrink-0 min-w-[24px] h-6 px-2 rounded-full bg-[#C8A94A] text-[#0B2545] text-xs font-bold flex items-center justify-center">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </HardLink>
                      </li>
                    )
                  })
                )}
              </ul>
            )}

            {activeFilter === "hubs" && (
              <ul className="space-y-0.5">
                {hubs.length === 0 ? (
                  <li className="px-4 py-6 text-center text-white/50 text-sm">
                    {q ? "No hubs match your search." : "No event hubs yet. Register for an event to see it here."}
                  </li>
                ) : (
                  hubs.map((event) => {
                    const group = getHubGroupForEvent(event.eventSlug)
                    const displayName = group ? getEventName(group.groupKey) : event.eventName
                    const href = event.href ?? null
                    return (
                      <li key={event.eventSlug}>
                        {href ? (
                          <HardLink
                            href={href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors touch-manipulation"
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#003366]/50 flex items-center justify-center">
                              <LayoutDashboard className="w-6 h-6 text-[#C8A94A]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate">{displayName}</p>
                              <p className="text-xs text-white/50 truncate">Event hub</p>
                            </div>
                          </HardLink>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-75">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#003366]/50 flex items-center justify-center">
                              <LayoutDashboard className="w-6 h-6 text-[#C8A94A]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white truncate">{displayName}</p>
                              <p className="text-xs text-white/50 truncate">Event hub — use link from your event email</p>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })
                )}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
