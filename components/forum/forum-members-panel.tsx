"use client"

import { useEffect, useState, useCallback } from "react"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Link2, UserPlus, Users, Loader2, Copy, Check, UserMinus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Member = { user_id: string; role: string; display_name: string; email: string | null; headshot_url?: string | null }
type SearchUser = { user_id: string; email: string | null; display_name: string }

export function ForumMembersPanel({ pathname, currentUserId, onClose }: { pathname: string; currentUserId?: string | null; onClose?: () => void }) {
  const match = pathname.match(/^\/forum\/groups\/([^/]+)\/channels\//)
  const groupId = match?.[1] ?? null

  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addSearch, setAddSearch] = useState("")
  const [addResults, setAddResults] = useState<SearchUser[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncSlug, setSyncSlug] = useState("nhsca-duals-2026")
  const [syncSubmitting, setSyncSubmitting] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const loadMembers = useCallback(() => {
    if (!groupId) return
    setMembersLoading(true)
    fetch(`/api/forum/groups/${groupId}/members`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false))
  }, [groupId])

  useEffect(() => {
    if (groupId) loadMembers()
    else setMembers([])
  }, [groupId, loadMembers])

  const handleGenerateInvite = () => {
    if (!groupId || inviteGenerating) return
    setInviteGenerating(true)
    setInviteUrl(null)
    fetch(`/api/forum/groups/${groupId}/invite-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expires_days: 7, max_uses: 50 }),
    })
      .then((r) => r.json())
      .then((data) => setInviteUrl(data.url ?? null))
      .catch(() => setInviteUrl(null))
      .finally(() => setInviteGenerating(false))
  }

  const copyInvite = () => {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    })
  }

  useEffect(() => {
    if (!addMemberOpen || addSearch.trim().length < 2) {
      setAddResults([])
      return
    }
    const t = setTimeout(() => {
      setAddSearching(true)
      fetch(`/api/messaging/users/search?q=${encodeURIComponent(addSearch.trim())}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          const users = (data.users ?? []) as SearchUser[]
          const memberIds = new Set(members.map((m) => m.user_id))
          setAddResults(users.filter((u) => !memberIds.has(u.user_id)))
        })
        .catch(() => setAddResults([]))
        .finally(() => setAddSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [addMemberOpen, addSearch, members])

  const currentUserRole = currentUserId ? members.find((m) => m.user_id === currentUserId)?.role : null
  const isGroupAdmin = currentUserRole === "admin"
  const canRemoveMembers = isGroupAdmin

  const handleRemoveMember = (userId: string) => {
    if (!groupId || removingId) return
    setRemovingId(userId)
    fetch(`/api/forum/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: userId }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Failed")
        loadMembers()
      })
      .catch((e) => console.error("[ForumMembersPanel] remove:", e))
      .finally(() => setRemovingId(null))
  }

  const handleAddMember = (userId: string) => {
    if (!groupId || addSubmitting) return
    setAddError(null)
    setAddSubmitting(true)
    fetch(`/api/forum/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: userId }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Failed")
        loadMembers()
        setAddMemberOpen(false)
        setAddSearch("")
        setAddResults([])
        return data
      })
      .catch((e) => setAddError(e instanceof Error ? e.message : "Failed to add"))
      .finally(() => setAddSubmitting(false))
  }

  const handleSyncEvent = () => {
    if (!groupId || syncSubmitting || !syncSlug.trim()) return
    setSyncResult(null)
    setSyncSubmitting(true)
    fetch(`/api/forum/groups/${groupId}/sync-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ event_slug: syncSlug.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        setSyncResult(data.message ?? `${data.added ?? 0} added.`)
        loadMembers()
      })
      .catch(() => setSyncResult("Sync failed."))
      .finally(() => setSyncSubmitting(false))
  }

  const asideClass = onClose ? "flex flex-col w-full flex-1 min-h-0 bg-[#0D1F3C]" : "hidden sm:flex flex-col w-[260px] flex-shrink-0 bg-[#0D1F3C] border-l border-white/10 overflow-y-auto"

  if (!groupId) {
    return (
      <aside className={asideClass + " overflow-y-auto"}>
        {onClose && (
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <p className="text-sm font-semibold text-white/80" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Members</p>
            <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-white/10 text-white" aria-label="Close"> <X className="w-5 h-5" /> </button>
          </div>
        )}
        {!onClose && (
          <div className="p-3 border-b border-white/10">
            <p className="text-sm font-semibold text-white/80" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Members</p>
            <p className="text-xs text-white/50 mt-0.5">Select a group channel to see members and invite.</p>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className={cn(asideClass, "text-[#F0F4FF] [&_input]:!bg-[#1a2d4a] [&_input]:!text-[#F0F4FF] [&_input]:!border-white/20 [&_input::placeholder]:!text-white/40 [&_label]:!text-[#F0F4FF]")}>
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#F0F4FF]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Members
          </p>
          <p className="text-xs text-white/60 mt-0.5">{members.length} member(s)</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-white/10 text-white flex-shrink-0" aria-label="Close members">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-3 border-b border-white/10">
        {isGroupAdmin && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-[#C8A94A]/50 text-[#C8A94A] hover:bg-[#C8A94A]/15 bg-transparent"
              onClick={handleGenerateInvite}
              disabled={inviteGenerating}
            >
              {inviteGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Generate invite link
            </Button>
            {inviteUrl && (
              <div className="flex items-center gap-2">
                <input readOnly value={inviteUrl} className="flex-1 min-w-0 rounded bg-[#1a2d4a] border border-white/20 px-2 py-1.5 text-xs text-[#F0F4FF] truncate" />
                <button type="button" onClick={copyInvite} className="p-1.5 rounded hover:bg-white/10 text-white" title="Copy">
                  {inviteCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            <Dialog open={addMemberOpen} onOpenChange={(o) => { setAddMemberOpen(o); if (!o) setAddError(null) }}>
              <Button size="sm" variant="outline" className="w-full border-white/30 text-[#F0F4FF] hover:bg-white/10 bg-transparent" onClick={() => setAddMemberOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add member
              </Button>
          <DialogContent className="bg-[#0D1F3C] border-white/10 text-[#F0F4FF] max-w-md [&_input]:!bg-[#1a2d4a] [&_input]:!text-[#F0F4FF] [&_input]:!border-white/20 [&_label]:!text-[#F0F4FF]">
            <DialogHeader>
            <DialogTitle className="text-[#F0F4FF]">Add member</DialogTitle>
            <DialogDescription className="text-white/70">Search by name or email. They must have a RecruitNC account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Search name or email…"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="!bg-[#1a2d4a] !border-white/20 !text-[#F0F4FF] placeholder:!text-white/40"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {addSearching && <p className="text-sm text-white/50">Searching…</p>}
                {!addSearching && addSearch.trim().length >= 2 && addResults.length === 0 && <p className="text-sm text-white/50">No users found or already in group.</p>}
                {addResults.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => handleAddMember(u.user_id)}
                    disabled={addSubmitting}
                    className="w-full text-left px-3 py-2 rounded bg-white/10 hover:bg-white/15 text-sm flex flex-col gap-0.5 text-[#F0F4FF]"
                  >
                    <span className="font-medium">{u.display_name}</span>
                    {u.email && <span className="text-xs text-white/60">{u.email}</span>}
                  </button>
                ))}
              </div>
              {addError && <p className="text-sm text-red-300">{addError}</p>}
            </div>
          </DialogContent>
        </Dialog>

            <Dialog open={syncOpen} onOpenChange={(o) => { setSyncOpen(o); if (!o) setSyncResult(null) }}>
              <Button size="sm" variant="outline" className="w-full border-white/30 text-[#F0F4FF] hover:bg-white/10 bg-transparent" onClick={() => setSyncOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                Add from event
              </Button>
              <DialogContent className="bg-[#0D1F3C] border-white/10 text-[#F0F4FF] max-w-md [&_input]:!bg-[#1a2d4a] [&_input]:!text-[#F0F4FF] [&_input]:!border-white/20 [&_label]:!text-[#F0F4FF]">
                <DialogHeader>
                  <DialogTitle className="text-[#F0F4FF]">Add members from event</DialogTitle>
                  <DialogDescription className="text-white/70">Add everyone with a paid registration for this event who has a RecruitNC account.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Label className="text-[#F0F4FF]">Event slug</Label>
                  <Input
                    value={syncSlug}
                    onChange={(e) => setSyncSlug(e.target.value)}
                    placeholder="nhsca-duals-2026"
                    className="!bg-[#1a2d4a] !border-white/20 !text-[#F0F4FF] placeholder:!text-white/40"
                  />
                  <Button onClick={handleSyncEvent} disabled={syncSubmitting} className="w-full bg-[#C8A94A] text-[#0B2545] hover:bg-[#E2C46A]">
                    {syncSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {syncSubmitting ? "Syncing…" : "Sync now"}
                  </Button>
                  {syncResult && <p className="text-sm text-white/80">{syncResult}</p>}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {membersLoading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-white/50">No members yet.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0 rounded-full border border-white/20">
                    <AvatarImage src={m.headshot_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-white/10 text-white text-xs">
                      {m.display_name.slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/gi, "") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F0F4FF] truncate">{m.display_name}</p>
                    <p className="text-xs text-white/60 truncate">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded", m.role === "admin" || m.role === "coach" ? "bg-[#C8A94A]/20 text-[#C8A94A]" : "bg-white/10 text-white/70")}>
                    {m.role}
                  </span>
                  {canRemoveMembers && m.user_id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user_id)}
                      disabled={!!removingId}
                      className="p-1.5 rounded text-white/50 hover:text-red-400 hover:bg-white/10 disabled:opacity-50"
                      title="Remove from group"
                      aria-label={`Remove ${m.display_name} from group`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
