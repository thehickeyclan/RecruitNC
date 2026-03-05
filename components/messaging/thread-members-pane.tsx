"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Users, Plus, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type ThreadMemberRow = {
  user_id: string
  role: string
  display_name: string
}

type SearchUser = { user_id: string; email: string | null; display_name: string }

function loadMembers(threadId: string): Promise<{ members: ThreadMemberRow[]; current_user_role?: string }> {
  return fetch(`/api/messaging/threads/${threadId}/members`, { credentials: "include" }).then((r) => r.json())
}

export function ThreadMembersPane({
  threadId,
  currentUserId,
  className,
}: {
  threadId: string
  currentUserId: string
  className?: string
}) {
  const [members, setMembers] = useState<ThreadMemberRow[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>("member")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [addSearchQuery, setAddSearchQuery] = useState("")
  const [addSearchResults, setAddSearchResults] = useState<SearchUser[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [copyLinkStatus, setCopyLinkStatus] = useState<"idle" | "copying" | "copied" | "error">("idle")

  const refreshMembers = useCallback(() => {
    if (!threadId) return
    loadMembers(threadId).then((data) => {
      setMembers(data.members ?? [])
      setCurrentUserRole(data.current_user_role ?? "member")
    })
  }, [threadId])

  useEffect(() => {
    if (!threadId) return
    setLoading(true)
    loadMembers(threadId)
      .then((data) => {
        setMembers(data.members ?? [])
        setCurrentUserRole(data.current_user_role ?? "member")
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [threadId])

  const filtered = search.trim()
    ? members.filter((m) => m.display_name.toLowerCase().includes(search.trim().toLowerCase()))
    : members

  const isAdmin = currentUserRole === "admin"

  useEffect(() => {
    if (!addOpen || addSearchQuery.trim().length < 2) {
      setAddSearchResults([])
      return
    }
    const t = setTimeout(() => {
      setAddSearching(true)
      fetch(`/api/messaging/threads/${threadId}/members/search?q=${encodeURIComponent(addSearchQuery)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setAddSearchResults(data.users ?? []))
        .catch(() => setAddSearchResults([]))
        .finally(() => setAddSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [addOpen, addSearchQuery, threadId])

  function handleAddMember(userId: string) {
    setAddingId(userId)
    fetch(`/api/messaging/threads/${threadId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: userId }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.ok) {
          refreshMembers()
          setAddSearchResults((prev) => prev.filter((u) => u.user_id !== userId))
        }
      })
      .finally(() => setAddingId(null))
  }

  async function handleCopyInviteLink() {
    setCopyLinkStatus("copying")
    try {
      const r = await fetch(`/api/messaging/threads/${threadId}/invite-link`, { credentials: "include" })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Failed to get link")
      await navigator.clipboard.writeText(data.url)
      setCopyLinkStatus("copied")
      setTimeout(() => setCopyLinkStatus("idle"), 2000)
    } catch {
      setCopyLinkStatus("error")
      setTimeout(() => setCopyLinkStatus("idle"), 2000)
    }
  }

  return (
    <div className={className ?? "flex flex-col h-full bg-gray-50 border-l border-gray-200"}>
      <div className="shrink-0 p-3 border-b border-gray-200">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Users className="h-4 w-4 text-[#003366]" />
          Members
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">{members.length} {members.length === 1 ? "member" : "members"}</p>
        <div className="mt-2 flex gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add RecruitNC user</DialogTitle>
                  <DialogDescription>Search by name or email. They must have a RecruitNC account. They’ll get an email with a link to the group.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="add-search">Search</Label>
                  <Input
                    id="add-search"
                    placeholder="Name or email…"
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {addSearching && <p className="text-sm text-gray-500 py-2 text-center">Searching…</p>}
                  {!addSearching && addSearchQuery.trim().length >= 2 && addSearchResults.length === 0 && (
                    <p className="text-sm text-gray-500 py-2 text-center">No users found. Try a different search.</p>
                  )}
                  {!addSearching && addSearchResults.map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => handleAddMember(u.user_id)}
                      disabled={!!addingId}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm flex flex-col gap-0.5"
                    >
                      <span className="font-medium text-gray-900">{u.display_name}</span>
                      {u.email && <span className="text-xs text-gray-500">{u.email}</span>}
                      {addingId === u.user_id && <span className="text-xs text-[#003366]">Adding…</span>}
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyInviteLink}
              disabled={copyLinkStatus === "copying"}
              className="gap-1"
              title="Copy invite link"
            >
              {copyLinkStatus === "copying" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              {copyLinkStatus === "copied" ? "Copied!" : copyLinkStatus === "error" ? "Error" : "Link"}
            </Button>
            )}
        </div>
        <input
          type="search"
          placeholder="Find a member"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
          aria-label="Search members"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#003366]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            {search.trim() ? "No members match." : "No members."}
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                <span className="truncate text-gray-900">
                  {m.display_name}
                  {m.user_id === currentUserId && (
                    <span className="ml-1 text-gray-500">(You)</span>
                  )}
                </span>
                {m.role === "admin" && (
                  <span className="shrink-0 rounded bg-[#003366]/10 px-1.5 py-0.5 text-xs font-medium text-[#003366]">
                    Admin
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
