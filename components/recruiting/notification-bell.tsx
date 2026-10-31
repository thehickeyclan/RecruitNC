"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { bellDate, useNavNotifications } from "@/hooks/use-nav-badges"

const iconButton = "relative flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"

/**
 * The recruiting bell, in the coach portal and RecruitWrestlers' family header: the person's own
 * notifications and each rankings release, report and story (hooks/use-nav-badges.ts).
 */
export function NotificationBell({ signedIn }: { signedIn: boolean }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const bell = useNavNotifications(signedIn, notificationsOpen)
  if (!signedIn) return null
  return (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={iconButton} aria-label={bell.unread > 0 ? `Notifications (${bell.unread} unread)` : "Notifications"}>
          <Bell className="h-5 w-5" />
          {bell.unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {bell.unread > 99 ? "99+" : bell.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      {/* Navy like the portal around it (Matt, 28 Oct 2026: "should the notifications be the dark blue, not white"). */}
      <PopoverContent align="end" className="w-[min(360px,100vw-24px)] border-white/15 bg-[#13294B] p-0 text-white shadow-2xl shadow-black/50" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <span className="text-sm font-bold">Notifications</span>
          {bell.unread > 0 && (
            <button type="button" onClick={bell.markAllRead} className="text-xs font-semibold text-white/55 hover:text-white">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {bell.notifications.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-white/50">No notifications yet.</p>
          ) : (
            bell.notifications.map((n) => (
              <a
                key={n.id}
                href={n.link || "#"}
                onClick={() => {
                  bell.markRead(n.id)
                  setNotificationsOpen(false)
                }}
                className={`flex gap-2.5 border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/[0.06] ${!n.read_at ? "bg-white/[0.04]" : ""}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? "bg-[#D3B574]" : "bg-transparent"}`} aria-hidden />
                <span className="min-w-0">
                  <span className={`block text-sm ${!n.read_at ? "font-semibold text-white" : "font-medium text-white/75"}`}>{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-white/55">{n.body}</span>}
                  <span className="mt-1 block text-xs text-white/45">{bellDate(n)}</span>
                </span>
              </a>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
