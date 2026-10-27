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
      <PopoverContent align="end" className="w-[min(340px,100vw-24px)] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {bell.unread > 0 && (
            <button type="button" onClick={bell.markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {bell.notifications.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            bell.notifications.map((n) => (
              <a
                key={n.id}
                href={n.link || "#"}
                onClick={() => {
                  bell.markRead(n.id)
                  setNotificationsOpen(false)
                }}
                className={`block border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-muted/50 ${!n.read_at ? "bg-muted/30" : ""}`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {bellDate(n)}
                </p>
              </a>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
