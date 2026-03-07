"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { HardLink } from "@/components/hard-link"
import { MessageCircle, Search, Users, ChevronRight, Menu, Plus, LayoutDashboard, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ForumMembersPanel } from "@/components/forum/forum-members-panel"

type ForumChannel = { id: string; name: string; type: string; coach_only: boolean }
type ForumGroup = { id: string; name: string; visibility: string; channels: ForumChannel[] }
type ForumDm = { id: string; type: string; last_message_at: string | null }

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [groups, setGroups] = useState<ForumGroup[]>([])
  const [dmConversations, setDmConversations] = useState<ForumDm[]>([])
  const [sidebarLoading, setSidebarLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupSubmitting, setNewGroupSubmitting] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string; headshot_url?: string | null } | null>(null)
  const [hubs, setHubs] = useState<HubListItem[]>([])
  const [forYou, setForYou] = useState<ForYou | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      setSidebarLoading(false)
      setCurrentUserProfile(null)
      setHubs([])
      setForYou(null)
      return
    }
    fetch("/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const name = data?.name ?? data?.full_name ?? ""
        setCurrentUserProfile({ name, headshot_url: data?.headshot_url ?? null })
      })
      .catch(() => setCurrentUserProfile(null))
    Promise.all([
      fetch("/api/forum/sidebar", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/communities/hubs", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/communities/for-you", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([sidebar, hubsRes, forYouRes]) => {
        setGroups(sidebar.groups ?? [])
        setDmConversations(sidebar.dmConversations ?? [])
        setHubs(hubsRes.hubs ?? [])
        setForYou(forYouRes)
      })
      .catch(() => {})
      .finally(() => setSidebarLoading(false))
  }, [user])

  const q = searchQuery.trim().toLowerCase()
  const filteredGroups = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q))
    : groups
  const filteredDms = q
    ? dmConversations.filter((d) => d.id.includes(q))
    : dmConversations
  const filteredHubs = q ? hubs.filter((h) => h.name.toLowerCase().includes(q)) : hubs
  const hasForYou =
    forYou &&
    (forYou.newAnnouncements > 0 || forYou.eventsThisWeek > 0 || forYou.unreadChatCount > 0)

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-[#0B2545] flex items-center justify-center p-6">
        <div className="bg-white/10 rounded-lg p-8 max-w-md text-center">
          <p className="text-white/90 mb-4">Sign in to use Community.</p>
          <HardLink
            href={`/auth/signin?returnTo=${encodeURIComponent("/forum")}`}
            className="inline-block px-6 py-2 rounded-lg bg-[#C8A94A] text-[#0B2545] font-semibold hover:bg-[#E2C46A]"
          >
            Sign in
          </HardLink>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0B2545] text-[#F0F4FF] overflow-hidden">
      {/* Left sidebar */}
      <aside
        className={cn(
          "flex flex-col w-[240px] flex-shrink-0 bg-[#091E3A] border-r border-white/10 z-20",
          "md:relative md:translate-x-0",
          sidebarOpen ? "absolute inset-y-0 left-0 translate-x-0" : "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:-translate-x-full"
        )}
      >
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 -ml-2 rounded hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <HardLink href="/" className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            RecruitNC
          </HardLink>
          <span className="text-white/60 text-sm">Community</span>
        </div>

        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="search"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#C8A94A]"
            />
          </div>
        </div>

        {hasForYou && forYou && (
          <div className="mx-2 mt-2 mb-1 rounded-lg bg-[#C8A94A]/20 border border-[#C8A94A]/30 px-3 py-2 text-sm">
            <p className="font-medium text-[#E2C46A] flex items-center gap-2">
              <Bell className="w-4 h-4 flex-shrink-0" />
              For you
            </p>
            <ul className="mt-1 space-y-0.5 text-white/90 text-xs">
              {forYou.newAnnouncements > 0 && (
                <li>{forYou.newAnnouncements} new update{forYou.newAnnouncements !== 1 ? "s" : ""}</li>
              )}
              {forYou.eventsThisWeek > 0 && (
                <li>{forYou.eventsThisWeek} event{forYou.eventsThisWeek !== 1 ? "s" : ""} this week</li>
              )}
              {forYou.unreadChatCount > 0 && (
                <li>{forYou.unreadChatCount} unread in chat</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {sidebarLoading ? (
            <p className="px-3 text-sm text-white/50">Loading…</p>
          ) : (
            <>
          {/* Direct messages first (Slack-style) */}
          <p className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Direct messages
          </p>
          {filteredDms.length === 0 ? (
            <p className="px-3 text-sm text-white/50">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {filteredDms.map((dm) => (
                <li key={dm.id}>
                  <HardLink
                    href={`/forum/dm/${dm.id}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm rounded-r-lg border-l-2",
                      pathname === `/forum/dm/${dm.id}` ? "bg-[#0B2545]/50 border-[#C8A94A] text-white" : "border-transparent text-white/80 hover:bg-white/5"
                    )}
                  >
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Conversation</span>
                  </HardLink>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between px-3 mt-4 mb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Groups
            </p>
            <Dialog open={newGroupOpen} onOpenChange={(o) => { setNewGroupOpen(o); if (!o) setNewGroupName("") }}>
              <DialogTrigger asChild>
                <button type="button" className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white" aria-label="New group">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#0D1F3C] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-[#F0F4FF]">Create group</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const name = newGroupName.trim()
                    if (!name || newGroupSubmitting) return
                    setNewGroupSubmitting(true)
                    try {
                      const res = await fetch("/api/forum/groups", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ name, visibility: "private" }),
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data?.error ?? "Failed")
                      setNewGroupOpen(false)
                      setNewGroupName("")
                      const chRes = await fetch("/api/forum/sidebar", { credentials: "include" })
                      const sidebar = await chRes.json()
                      setGroups(sidebar.groups ?? [])
                      const created = (sidebar.groups ?? []).find((g: ForumGroup) => g.id === data.group.id)
                      const firstCh = created?.channels?.[0]
                      if (firstCh) router.push(`/forum/groups/${data.group.id}/channels/${firstCh.id}`)
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setNewGroupSubmitting(false)
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="group-name" className="text-white/80">Group name</Label>
                    <Input
                      id="group-name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. NHSCA Duals 2026"
                      className="mt-1 bg-white/5 border-white/10 text-white"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={!newGroupName.trim() || newGroupSubmitting} className="bg-[#C8A94A] text-[#0B2545] hover:bg-[#E2C46A]">
                    {newGroupSubmitting ? "Creating…" : "Create"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {filteredGroups.length === 0 ? (
            <p className="px-3 text-sm text-white/50">No groups yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {filteredGroups.map((group) => {
                const singleChannel = group.channels.find((c) => c.name === "general") ?? group.channels[0]
                if (!singleChannel) return null
                const href = `/forum/groups/${group.id}/channels/${singleChannel.id}`
                const active = pathname === href
                return (
                  <li key={group.id}>
                    <HardLink
                      href={href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-r-lg border-l-2",
                        active
                          ? "bg-[#0B2545]/50 border-[#C8A94A] text-white font-medium"
                          : "border-transparent text-white/80 hover:bg-white/5 hover:text-white"
                      )}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      <span className="truncate">{group.name}</span>
                    </HardLink>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Hubs
          </p>
          {filteredHubs.length === 0 ? (
            <p className="px-3 text-sm text-white/50">No event hubs yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {filteredHubs.map((hub) => {
                const href = hub.href
                const active = pathname === "/national-team/hub"
                return (
                  <li key={hub.id}>
                    <HardLink
                      href={href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-r-lg border-l-2 min-h-[44px]",
                        active
                          ? "bg-[#0B2545]/50 border-[#C8A94A] text-white font-medium"
                          : "border-transparent text-white/80 hover:bg-white/5 hover:text-white"
                      )}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      <LayoutDashboard className="w-4 h-4 flex-shrink-0 text-white/70" />
                      <span className="truncate">{hub.name}</span>
                    </HardLink>
                  </li>
                )
              })}
            </ul>
          )}
            </>
          )}
        </div>

        <div className="p-2 border-t border-white/10 flex items-center gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0 rounded-full border border-white/20">
            <AvatarImage src={currentUserProfile?.headshot_url ?? undefined} alt="" />
            <AvatarFallback className="bg-[#C8A94A]/30 text-[#0B2545] text-sm font-semibold">
              {(currentUserProfile?.name || user?.email || "?").slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/gi, "") || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/80 truncate flex-1 min-w-0">{currentUserProfile?.name || user?.email || "—"}</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0B2545]">
        <header className="flex-shrink-0 h-12 border-b border-white/10 flex items-center gap-2 px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded hover:bg-white/10"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setMembersOpen((o) => !o)}
            className="ml-auto p-2 rounded hover:bg-white/10 flex items-center gap-1 text-sm text-white/70"
            aria-label={membersOpen ? "Hide members" : "Show members"}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Members</span>
          </button>
        </header>
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-auto min-w-0">
            {children}
          </div>
          {membersOpen && <ForumMembersPanel pathname={pathname} currentUserId={user?.id ?? null} />}
        </div>
      </main>
    </div>
  )
}
