"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { InboxList, type InboxThread } from "@/components/messaging/inbox-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageCircle, Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type FilterTab = "all" | "unread"

export default function MessagesPage() {
  const router = useRouter()
  const { user, isLoading, profile } = useAuth()
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupSubmitting, setNewGroupSubmitting] = useState(false)
  const [newGroupError, setNewGroupError] = useState<string | null>(null)
  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetch("/api/messaging/inbox", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setThreads(data.threads ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [user])

  const byFilter = filter === "unread" ? threads.filter((t) => t.unread_count > 0) : threads
  const q = searchQuery.trim().toLowerCase()
  const filteredThreads = q
    ? byFilter.filter((t) => t.name.toLowerCase().includes(q) || (t.last_message_preview ?? "").toLowerCase().includes(q))
    : byFilter
  const unreadCount = threads.filter((t) => t.unread_count > 0).length

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name || newGroupSubmitting) return
    setNewGroupError(null)
    setNewGroupSubmitting(true)
    try {
      const res = await fetch("/api/admin/messaging/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to create group")
      setNewGroupOpen(false)
      setNewGroupName("")
      setThreads((prev) => [
        { id: data.threadId, name: data.name, type: "group", context_type: null, context_id: null, last_message_at: new Date().toISOString(), last_message_preview: null, unread_count: 0 },
        ...prev,
      ])
      router.push(`/messages/${data.threadId}`)
    } catch (err) {
      setNewGroupError(err instanceof Error ? err.message : "Failed to create group")
    } finally {
      setNewGroupSubmitting(false)
    }
  }

  if (isLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-[#003366] font-medium">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Sign in to view your messages.</p>
            <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
              <a href={`/auth/signin?returnTo=${encodeURIComponent("/messages")}`}>Sign in</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-[#003366]">Messages</h1>
              <p className="text-sm text-gray-500 mt-0.5">Your groups. Tap one to open. Use search to find a chat.</p>
            </div>
            {isAdmin && (
              <Dialog open={newGroupOpen} onOpenChange={(open) => { setNewGroupOpen(open); if (!open) setNewGroupError(null) }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="shrink-0 bg-[#003366] hover:bg-[#003366]/90">
                    <Plus className="h-4 w-4 mr-1" />
                    New group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateGroup}>
                    <DialogHeader>
                      <DialogTitle>Create new group</DialogTitle>
                      <DialogDescription>Add a group name. You’ll be added as an admin. You can add more members later from the thread.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                      <Label htmlFor="new-group-name">Group name</Label>
                      <Input
                        id="new-group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g. NHSCA Duals 2026"
                        maxLength={200}
                        required
                        className="max-w-full"
                      />
                      {newGroupError && <p className="text-sm text-red-600">{newGroupError}</p>}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setNewGroupOpen(false)} disabled={newGroupSubmitting}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-[#003366] hover:bg-[#003366]/90" disabled={!newGroupName.trim() || newGroupSubmitting}>
                        {newGroupSubmitting ? "Creating…" : "Create group"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {threads.length > 0 && (
            <>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
                <input
                  type="search"
                  placeholder="Find chats"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm placeholder:text-gray-500 focus:border-[#003366] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003366]"
                  aria-label="Search chats"
                />
              </div>
              <div className="flex gap-1 mt-3 p-1 bg-gray-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  filter === "all" ? "bg-white text-[#003366] shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                  filter === "unread" ? "bg-white text-[#003366] shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#003366] px-1.5 text-xs font-medium text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            </>
          )}
        </div>
        <Card className="rounded-none border-x-0 border-b-0 shadow-none">
          <CardContent className="p-0">
            {filteredThreads.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <h2 className="text-sm font-semibold text-gray-700">Your groups</h2>
              </div>
            )}
            <InboxList
              threads={filteredThreads}
              loading={loading}
              emptyFiltered={filter === "unread" && threads.length > 0 && filteredThreads.length === 0}
              emptySearch={!!q && byFilter.length > 0 && filteredThreads.length === 0}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
