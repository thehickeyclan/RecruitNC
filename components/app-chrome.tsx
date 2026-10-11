"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { COACH_PREVIEW_KEY, usesRecruitingShell } from "@/lib/recruiting/brand"
import { RecruitingShell } from "@/components/recruiting/recruiting-shell"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ConditionalAuthGuard } from "@/components/conditional-auth-guard"
import { AIChatWidget } from "@/components/ai-chat-widget-recruitnc"

/**
 * A college coach's header and footer are the recruiting product's (lib/recruiting/brand.ts), on
 * every page. The role arrives with the profile, a request after the page; the last answer is kept
 * in this browser so a coach is not shown the community bar for a moment on every page load.
 */
const SHELL_HINT_KEY = "recruiting-shell"

function useRecruitingShell(): boolean {
  const { user, profile, isLoading } = useAuth()
  const [hint, setHint] = useState(false)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    try {
      const view = new URLSearchParams(window.location.search).get("view")
      if (view === "coach") localStorage.setItem(COACH_PREVIEW_KEY, "1")
      if (view === "admin") localStorage.removeItem(COACH_PREVIEW_KEY)
      setPreview(localStorage.getItem(COACH_PREVIEW_KEY) === "1")
      setHint(localStorage.getItem(SHELL_HINT_KEY) === "1")
    } catch {}
  }, [])
  useEffect(() => {
    if (isLoading) return
    try {
      if (profile) {
        if (usesRecruitingShell(profile)) localStorage.setItem(SHELL_HINT_KEY, "1")
        else localStorage.removeItem(SHELL_HINT_KEY)
      } else if (!user) {
        localStorage.removeItem(SHELL_HINT_KEY)
      }
    } catch {}
  }, [user, profile, isLoading])
  const isAdmin = profile?.is_admin === true || profile?.role === "admin"
  if (profile) return usesRecruitingShell(profile) || (isAdmin && preview)
  // Nothing is known yet; an admin previewing gets the coach frame from the first paint too.
  return (hint || preview) && (isLoading || !!user)
}

/**
 * Spartan campaign and future microsites: no portal nav/footer/chat so the page owns the full frame.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const path = pathname && pathname.length > 0 ? pathname : "/"
  const recruitingShell = useRecruitingShell()
  /*
   * A coach who opens the site at its front door is at work, not shopping for an account: the
   * homepage sells sign-up to people who have not signed in. Send them to Coach Home. The NC
   * United menu's Home link carries ?community=1 so the homepage is still one click away.
   */
  const { profile } = useAuth()
  const coachAtFrontDoor = path === "/" && usesRecruitingShell(profile)
  useEffect(() => {
    if (!coachAtFrontDoor) return
    if (new URLSearchParams(window.location.search).has("community")) return
    window.location.replace("/coach-home")
  }, [coachAtFrontDoor])
  // No chat launcher in the coach portal at all (Matt, 11 October 2026).
  // On the community side, the inbox keeps its reply box and send button in the corner the chat launcher floats over.
  const chat = path === "/inbox" || path.startsWith("/inbox/") ? null : <AIChatWidget />
  const isSpartanCampaign = path === "/spartan" || path.startsWith("/spartan/")
  if (isSpartanCampaign) {
    return (
      <div id="app-content" className="relative flex min-h-screen flex-col bg-[#0A0A0A]">
        <ConditionalAuthGuard>
          <main className="flex-1">{children}</main>
        </ConditionalAuthGuard>
      </div>
    )
  }

  if (recruitingShell) {
    return (
      <>
        <RecruitingShell>
          <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
        </RecruitingShell>
      </>
    )
  }

  return (
    <div id="app-content" data-shell="community" className="group/shell relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
      </main>
      <Footer />
      {chat}
    </div>
  )
}
