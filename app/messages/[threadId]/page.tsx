"use client"

import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ThreadView } from "@/components/messaging/thread-view"
import { ThreadMembersPane } from "@/components/messaging/thread-members-pane"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Archive, Link2, Loader2, Users, Pencil, MoreVertical, Lock, Globe } from "lucide-react"
import { useEffect, useState } from "react"

export default function ThreadPage() {
  const params = useParams()
  const { user, isLoading, profile } = useAuth()
  const threadId = typeof params?.threadId === "string" ? params.threadId : ""
  const [threadName, setThreadName] = useState<string>("")
  const [visibility, setVisibility] = useState<"private" | "public">("private")
  const [isThreadAdmin, setIsThreadAdmin] = useState(false)
  const [isEventThread, setIsEventThread] = useState(false)
  const [visibilityUpdating, setVisibilityUpdating] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renaming, setRenaming] = useState(false)
  const isAdmin = profile?.is_admin === true

  function copyThreadLink() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/messages/${threadId}` : ""
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  useEffect(() => {
    if (!threadId || !user) return
    let cancelled = false
    function checkAccess(retry = false) {
      fetch(`/api/messaging/threads/${threadId}`, { credentials: "include" })
        .then((r) => {
          if (cancelled) return
          if (r.status === 403) {
            if (retry) {
              setForbidden(true)
              return r.json()
            }
            // Retry once after a short delay (e.g. after creating a new group, membership can take a moment)
            setTimeout(() => checkAccess(true), 500)
            return r.json()
          }
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          if (data?.thread) {
            setThreadName(data.thread.name ?? "")
            setVisibility(data.thread.visibility === "public" ? "public" : "private")
            setIsEventThread(data.thread.context_type === "event")
          }
          if (data?.membership?.role === "admin") setIsThreadAdmin(true)
        })
        .catch(() => {
          if (!cancelled) setForbidden(true)
        })
    }
    checkAccess()
    return () => { cancelled = true }
  }, [threadId, user])

  async function handleRename() {
    const name = renameValue.trim()
    if (!threadId || !name || renaming) return
    setRenaming(true)
    try {
      const res = await fetch(`/api/messaging/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Failed to rename")
      setThreadName(name)
      setRenameOpen(false)
    } catch {
      // keep dialog open
    } finally {
      setRenaming(false)
    }
  }

  async function setGroupVisibility(value: "private" | "public") {
    if (!threadId || !isThreadAdmin || visibilityUpdating || value === visibility) return
    setVisibilityUpdating(true)
    try {
      const res = await fetch(`/api/messaging/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility: value }),
      })
      if (res.ok) setVisibility(value)
    } finally {
      setVisibilityUpdating(false)
    }
  }

  async function handleArchive() {
    if (!threadId || !isAdmin || archiving) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/admin/messaging/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archive: true }),
      })
      if (!res.ok) throw new Error("Failed to archive")
      window.location.href = "/messages"
    } catch {
      setArchiving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(`/messages/${threadId}`)}`
    }
    return null
  }

  if (forbidden || !threadId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You don’t have access to this conversation.</p>
          <Button asChild variant="outline">
            <a href="/messages">Back to Messages</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-0px)] w-full bg-white">
      {/* Thread area: centered column, max-w-2xl */}
      <div className="flex-1 min-w-0 flex flex-col max-w-2xl mx-auto w-full">
        <div className="shrink-0 flex items-center gap-2 border-b px-4 py-3 bg-white">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <a href="/messages" aria-label="Back to messages">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Button>
          <h1 className="text-lg font-semibold truncate flex-1">{threadName || "…"}</h1>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={copyThreadLink}
            aria-label="Copy workspace link"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{linkCopied ? "Copied!" : "Copy link"}</span>
          </Button>
          {/* Mobile: Members button opens sheet */}
          <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="View members">
                <Users className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[320px] p-0 flex flex-col">
              <ThreadMembersPane threadId={threadId} currentUserId={user.id} className="flex-1 min-h-0" />
            </SheetContent>
          </Sheet>
          {isEventThread && (
            <a
              href="/national-team/hub"
              className="shrink-0 text-sm font-medium text-[#003366] hover:underline"
            >
              Team hub
            </a>
          )}
          {(isThreadAdmin || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Group options"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isThreadAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => { setRenameValue(threadName); setRenameOpen(true) }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename group
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger disabled={visibilityUpdating}>
                        {visibility === "public" ? <Globe className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                        Group visibility
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={visibility} onValueChange={(v) => setGroupVisibility(v as "private" | "public")}>
                          <DropdownMenuRadioItem value="private">
                            <Lock className="h-4 w-4 mr-2" />
                            Private — invite only
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="public">
                            <Globe className="h-4 w-4 mr-2" />
                            Public — visible to all RecruitNC users
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
                {isThreadAdmin && isAdmin && <DropdownMenuSeparator />}
                {isAdmin && (
                  <DropdownMenuItem onClick={handleArchive} disabled={archiving} className="text-red-600 focus:text-red-600">
                    {archiving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <ThreadView
            threadId={threadId}
            threadName={threadName}
            currentUserId={user.id}
          />
        </div>
      </div>
      {/* Desktop: members pane on the right */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:h-full">
        <ThreadMembersPane threadId={threadId} currentUserId={user.id} />
      </aside>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Group name"
              maxLength={200}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
                {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
