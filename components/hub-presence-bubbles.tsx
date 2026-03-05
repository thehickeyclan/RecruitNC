"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type PresenceUser = { user_id: string; display_name: string; initials: string }

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
    }
    return displayName.slice(0, 2).toUpperCase()
  }
  if (email?.trim()) {
    const local = email.split("@")[0]
    return (local.slice(0, 2) || "?").toUpperCase()
  }
  return "?"
}

export function HubPresenceBubbles({
  channelId,
  currentUserId,
  displayName,
  email,
}: {
  channelId: string
  currentUserId: string
  displayName: string | null
  email: string | null
}) {
  const [present, setPresent] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!currentUserId || !channelId) return
    const supabase = createClient()
    const channel = supabase.channel(`hub-presence-${channelId}`)
    const display = displayName?.trim() || email?.split("@")[0] || "Someone"
    const initialsStr = getInitials(displayName, email)

    const syncPresence = () => {
      const state = channel.presenceState()
      const seen = new Map<string, PresenceUser>()
      for (const ref of Object.keys(state)) {
        const list = state[ref] as Array<{ user_id?: string; display_name?: string; initials?: string }>
        for (const p of list ?? []) {
          const uid = p?.user_id
          if (uid && !seen.has(uid)) {
            seen.set(uid, {
              user_id: uid,
              display_name: p.display_name ?? "Someone",
              initials: (p.initials ?? "?").slice(0, 2),
            })
          }
        }
      }
      setPresent(Array.from(seen.values()))
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            display_name: display,
            initials: initialsStr,
          })
          syncPresence()
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [channelId, currentUserId, displayName, email])

  const others = present.filter((p) => p.user_id !== currentUserId)
  if (others.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-500 mr-0.5">Here now:</span>
      {others.map((p) => (
        <span
          key={p.user_id}
          title={p.display_name}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#003366] text-white text-xs font-medium shrink-0"
        >
          {p.initials}
        </span>
      ))}
    </div>
  )
}
