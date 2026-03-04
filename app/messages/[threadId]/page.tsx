"use client"

import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ThreadView } from "@/components/messaging/thread-view"
import { ThreadMembersPane } from "@/components/messaging/thread-members-pane"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Loader2, Users } from "lucide-react"
import { useEffect, useState } from "react"

export default function ThreadPage() {
  const params = useParams()
  const { user, isLoading } = useAuth()
  const threadId = typeof params?.threadId === "string" ? params.threadId : ""
  const [threadName, setThreadName] = useState<string>("")
  const [isEventThread, setIsEventThread] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)

  useEffect(() => {
    if (!threadId || !user) return
    fetch(`/api/messaging/threads/${threadId}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 403) setForbidden(true)
        return r.json()
      })
      .then((data) => {
        setThreadName(data?.thread?.name ?? "")
        setIsEventThread(data?.thread?.context_type === "event")
      })
      .catch(() => setForbidden(true))
  }, [threadId, user])

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
    </div>
  )
}
