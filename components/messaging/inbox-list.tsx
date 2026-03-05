"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2, Archive, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type InboxThread = {
  id: string
  name: string
  type: string
  context_type: string | null
  context_id: string | null
  last_message_at: string
  last_message_preview: string | null
  unread_count: number
}

export function InboxList({
  threads,
  loading,
  emptyFiltered,
  emptySearch,
  isAdmin,
  onArchive,
  onDelete,
}: {
  threads: InboxThread[]
  loading: boolean
  emptyFiltered?: boolean
  emptySearch?: boolean
  isAdmin?: boolean
  onArchive?: (threadId: string) => void
  onDelete?: (threadId: string) => void
}) {
  const router = useRouter()
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        {emptySearch ? (
          <>
            <p className="text-gray-600 font-medium">No chats match your search</p>
            <p className="text-sm text-gray-500 mt-1">Try a different search or clear the search box.</p>
          </>
        ) : emptyFiltered ? (
          <>
            <p className="text-gray-600 font-medium">No unread messages</p>
            <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
          </>
        ) : (
          <>
            <p className="text-gray-600 font-medium">No messages yet</p>
            <p className="text-sm text-gray-500 mt-1">When you're added to a team or event group, it will show up here.</p>
          </>
        )}
      </div>
    )
  }

  async function handleArchive(threadId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!onArchive || archivingId) return
    setArchivingId(threadId)
    try {
      const res = await fetch(`/api/admin/messaging/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archive: true }),
      })
      if (res.ok) onArchive(threadId)
    } finally {
      setArchivingId(null)
    }
  }

  async function handleDelete(threadId: string) {
    if (!onDelete) return
    setDeletingId(threadId)
    try {
      const res = await fetch(`/api/admin/messaging/threads/${threadId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        onDelete(threadId)
        setDeleteThreadId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ul className="divide-y">
      {threads.map((t) => (
        <li key={t.id}>
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-4 min-h-[72px] border-l-4 border-transparent",
              t.unread_count > 0 && "bg-blue-50/80 border-l-[#003366]"
            )}
          >
            <button
              type="button"
              onClick={() => router.push(`/messages/${t.id}`)}
              className={cn(
                "flex-1 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors rounded -m-2 p-2 min-w-0",
                t.unread_count > 0 && "hover:bg-blue-50/80"
              )}
            >
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#003366]",
                t.unread_count > 0 ? "bg-[#003366]/20" : "bg-[#003366]/10"
              )}>
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate", t.unread_count > 0 ? "font-bold text-[#003366]" : "font-semibold text-gray-900")}>{t.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">{formatTime(t.last_message_at)}</span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {t.last_message_preview || "No messages yet"}
                </p>
              </div>
              {t.unread_count > 0 && (
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#003366] px-2 text-xs font-medium text-white">
                  {t.unread_count > 99 ? "99+" : t.unread_count}
                </span>
              )}
            </button>
            {isAdmin && (onArchive || onDelete) && (
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {onArchive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-[#003366]"
                    onClick={(e) => handleArchive(t.id, e)}
                    disabled={!!archivingId}
                    title="Archive"
                    aria-label="Archive group"
                  >
                    {archivingId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                    onClick={() => setDeleteThreadId(t.id)}
                    disabled={!!deletingId}
                    title="Delete"
                    aria-label="Delete group"
                  >
                    {deletingId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
      <AlertDialog open={deleteThreadId !== null} onOpenChange={(open) => !open && setDeleteThreadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and all its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteThreadId && handleDelete(deleteThreadId)}
              disabled={!!deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ul>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
