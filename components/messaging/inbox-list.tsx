"use client"

import { useRouter } from "next/navigation"
import { MessageCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function InboxList({ threads, loading }: { threads: InboxThread[]; loading: boolean }) {
  const router = useRouter()

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
        <p className="text-gray-600 font-medium">No messages yet</p>
        <p className="text-sm text-gray-500 mt-1">When you're added to a team or event group, it will show up here.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {threads.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => router.push(`/messages/${t.id}`)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors min-h-[72px] border-l-4 border-transparent",
              t.unread_count > 0 && "bg-blue-50/80 border-l-[#003366]"
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
        </li>
      ))}
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
