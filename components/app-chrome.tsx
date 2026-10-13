"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { COACH_PREVIEW_KEY, usesRecruitingShell } from "@/lib/recruiting/brand"
import { PORTAL_HINT_COOKIE } from "@/lib/portal-hint"
import { classifyViewer } from "@/lib/viewer-role"
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

/*
 * Where an admin's coach view applies: the coach portal's own pages. It used to follow an admin
 * onto every page, so the NC United site looked replaced by the coach portal (Matt, 12 October
 * 2026: "you changed nc united website our front end"). A real coach still gets the portal frame
 * everywhere; this is only the staff preview.
 */
const COACH_PORTAL_PATHS = ["/coach-home", "/my-recruits", "/prospects", "/athletes", "/view-profile", "/inbox", "/public-rankings", "/compare", "/perfect-recruit", "/scouting-report"]
/**
 * Pages with no Data Dawg launcher whoever is looking: the inbox (it covers the send button) and
 * the pages that exist only for coaches.
 */
const NO_CHAT_PATHS = [
  "/inbox",
  "/coach-home",
  "/my-recruits",
  "/perfect-recruit",
  // Sign-up is where a college coach first meets the site, before we know he is one: the coach
  // step is a choice made on /auth/signup itself, so the whole page goes without (Matt, 13 Oct 2026).
  "/auth/signup",
  "/auth/coach-signup",
  "/auth/coach-pending",
  "/auth/coach-verification-pending",
]

const onCoachPortal = (path: string) => COACH_PORTAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

function useRecruitingShell(): boolean {
  const { user, profile, isLoading } = useAuth()
  const portalPage = onCoachPortal(usePathname() ?? "/")
  const [hint, setHint] = useState(false)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    try {
      const view = new URLSearchParams(window.location.search).get("view")
      /*
       * Coach Home is the door into the coach portal, for staff too. An admin who opened it kept
       * the community bar and could not find the side menu he had asked for (Matt, 12 October
       * 2026), so landing there turns coach view on; "Coach view · exit" in the top bar turns it
       * off. It only takes effect for an admin (see below), and ?view=admin still overrides it.
       */
      if (view === "coach" || (view !== "admin" && window.location.pathname === "/coach-home")) localStorage.setItem(COACH_PREVIEW_KEY, "1")
      if (view === "admin") localStorage.removeItem(COACH_PREVIEW_KEY)
      setPreview(localStorage.getItem(COACH_PREVIEW_KEY) === "1")
      setHint(localStorage.getItem(SHELL_HINT_KEY) === "1")
    } catch {}
  }, [])
  useEffect(() => {
    if (isLoading) return
    try {
      if (profile) {
        const coach = usesRecruitingShell(profile)
        if (coach) localStorage.setItem(SHELL_HINT_KEY, "1")
        else localStorage.removeItem(SHELL_HINT_KEY)
        // The same answer where the server can read it, so the front page is decided before it is
        // drawn (lib/coach-front-door.ts). A hint, not a credential.
        document.cookie = `${PORTAL_HINT_COOKIE}=${coach ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`
      } else if (!user) {
        localStorage.removeItem(SHELL_HINT_KEY)
        document.cookie = `${PORTAL_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`
      }
    } catch {}
  }, [user, profile, isLoading])
  const isAdmin = profile?.is_admin === true || profile?.role === "admin"
  if (profile) return usesRecruitingShell(profile) || (isAdmin && preview && portalPage)
  // Nothing is known yet; an admin previewing gets the coach frame from the first paint too.
  return (hint || (preview && portalPage)) && (isLoading || !!user)
}

/**
 * Spartan campaign and future microsites: no portal nav/footer/chat so the page owns the full frame.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const path = pathname && pathname.length > 0 ? pathname : "/"
  /*
   * The local "view as this coach" page (app/dev/coach-preview) has no session, so it was drawn in
   * the community frame - top menu, chat launcher - around a coach's content. A coach never sees
   * that combination, and a preview that is wrong about the frame is wrong about the page.
   */
  const devCoachPreview = process.env.NODE_ENV !== "production" && path.startsWith("/dev/coach-preview")
  const recruitingShell = useRecruitingShell() || devCoachPreview
  /*
   * A coach who opens the site at its front door is at work, not shopping for an account: the
   * homepage sells sign-up to people who have not signed in. Send them to Coach Home, always:
   * the recruiting portal is being separated from the community site (Matt, 13 October 2026).
   */
  const { profile } = useAuth()
  const coachAtFrontDoor = path === "/" && usesRecruitingShell(profile)
  useEffect(() => {
    // The server normally does this first (middleware.ts); this catches a coach it could not yet
    // recognise. There is no way round it: the community front page is not a coach's page.
    if (!coachAtFrontDoor) return
    window.location.replace("/coach-home")
  }, [coachAtFrontDoor])
  // No chat launcher in the coach portal at all (Matt, 11 October 2026).
  // On the community side, the inbox keeps its reply box and send button in the corner the chat launcher floats over.
  /*
   * Data Dawg is for wrestlers, families and the community site - never for a college coach
   * (Matt, 13 October 2026). So it is decided by who is signed in, not by the page: a coach has no
   * launcher anywhere, including the split second before his profile has loaded, when this frame
   * could otherwise draw the community bar and the dog around his page. A family has it on the
   * War Room, the college map and every school page like anywhere else.
   */
  const { isLoading: authLoading } = useAuth()
  const isCoach = classifyViewer(profile).isCollegeCoach
  const noChatPage = NO_CHAT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
  const chat = noChatPage || isCoach || authLoading ? null : <AIChatWidget />
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
