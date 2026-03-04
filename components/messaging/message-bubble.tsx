"use client"

import { cn } from "@/lib/utils"

export type MessageRow = {
  id: string
  thread_id: string
  sender_id: string
  type: "message" | "announcement"
  body: string
  created_at: string
  sender_name?: string | null
}

export function MessageBubble(
  props: { message: MessageRow; isOwn: boolean; currentUserId: string }
) {
  const { message, isOwn, currentUserId } = props
  const displayName = message.sender_name ?? (isOwn ? "You" : "Member")
  const isAnnouncement = message.type === "announcement"
  const time = new Date(message.created_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isAnnouncement && "bg-amber-100 text-amber-900 border border-amber-200",
          !isAnnouncement && isOwn && "bg-[#003366] text-white",
          !isAnnouncement && !isOwn && "bg-gray-100 text-gray-900"
        )}
      >
        {isAnnouncement && (
          <div className="text-xs font-semibold text-amber-700 mb-1">Announcement</div>
        )}
        {!isOwn && !isAnnouncement && (
          <div className="text-xs font-medium text-gray-500 mb-0.5">{displayName}</div>
        )}
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
      </div>
      <div className="text-xs text-gray-400 px-1">{time}</div>
    </div>
  )
}
