"use client"

import { BrandFooter, BrandHeader } from "@/components/recruiting/brand-frames"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { COACH_PREVIEW_KEY, hasCommunityAccess, isNationalHost, usesRecruitingShell } from "@/lib/recruiting/brand"
import { PORTAL_HINT_COOKIE, PORTAL_PARTNER_COOKIE } from "@/lib/portal-hint"
import { classifyViewer } from "@/lib/viewer-role"
import { RecruitingShell } from "@/components/recruiting/recruiting-shell"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { FamilyProfileBand } from "@/components/family-profile-band"
import { ConditionalAuthGuard } from "@/components/conditional-auth-guard"
import { AIChatWidget } from "@/components/ai-chat-widget-recruitnc"
import { ScoutLauncher } from "@/components/scout-launcher"

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
const COACH_PORTAL_PATHS = ["/coach-home", "/my-recruits", "/prospects", "/athletes", "/view-profile", "/inbox", "/public-rankings", "/compare", "/perfect-recruit", "/interested", "/scouting-report"]
/**
 * Pages with no Data Dawg launcher whoever is looking: the inbox (it covers the send button) and
 * the pages that exist only for coaches.
 */
/**
 * Pages that carry no "your profile" band (components/family-profile-band.tsx): the profile and
 * the claim flow themselves, the family portal, sign-in, staff pages, and pages that already open
 * with their own claim prompt (the homepage, the rankings sales page, the athlete directory).
 */
const NO_FAMILY_BAND_PATHS = ["/profile", "/view-profile", "/my-recruiting", "/recruiting", "/auth", "/admin", "/create-profile", "/claim", "/checkout", "/inbox", "/unsubscribe", "/dev", "/prospects/all", "/submit-profile", "/profile-setup"]
function familyBandAt(path: string): "top" | "foot" | null {
  if (path === "/" || path === "/rankings") return null
  if (/^\/athletes\/[^/]+/.test(path)) return null
  if (NO_FAMILY_BAND_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null
  // On the rankings it leads the page: that is where a family is looking for their wrestler.
  return path === "/public-rankings" || path.startsWith("/public-rankings/") ? "top" : "foot"
}

/**
 * The families' recruiting pages: their assistant is Scout (Matt, 18 Oct 2026). Scout's own page
 * has no launcher; everywhere else keeps Data Dawg.
 */
const SCOUT_PATHS = ["/my-recruiting", "/recruiting", "/command-center", "/plans"]
const onScoutPage = (path: string) => SCOUT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

const NO_CHAT_PATHS = [
  "/inbox",
  "/coach-home",
  "/my-recruits",
  "/perfect-recruit",
  "/interested",
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
        // A partner program's coach (UNC) may cross to the NC United site; the server reads this too.
        document.cookie = hasCommunityAccess(profile)
          ? `${PORTAL_PARTNER_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
          : `${PORTAL_PARTNER_COOKIE}=; path=/; max-age=0; samesite=lax`
      } else if (!user) {
        localStorage.removeItem(SHELL_HINT_KEY)
        document.cookie = `${PORTAL_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`
        document.cookie = `${PORTAL_PARTNER_COOKIE}=; path=/; max-age=0; samesite=lax`
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
  const coachAtFrontDoor = path === "/" && usesRecruitingShell(profile) && !(typeof window !== "undefined" && isNationalHost(window.location.hostname))
  useEffect(() => {
    // The server normally does this first (middleware.ts); this catches a coach it could not yet
    // recognise. There is no way round it: the community front page is not a coach's page.
    if (!coachAtFrontDoor) return
    // The one exception: a partner program's coach who chose the NC United link.
    if (hasCommunityAccess(profile) && new URLSearchParams(window.location.search).has("community")) return
    window.location.replace("/coach-home")
  }, [coachAtFrontDoor, profile])
  // No chat launcher in the coach portal at all (Matt, 11 October 2026).
  // On the community side, the inbox keeps its reply box and send button in the corner the chat launcher floats over.
  /*
   * Data Dawg is for wrestlers, families and the community site - never for a college coach
   * (Matt, 13 October 2026). So it is decided by who is signed in, not by the page: a coach has no
   * launcher anywhere, including the split second before his profile has loaded, when this frame
   * could otherwise draw the community bar and the dog around his page. A family has it on the
   * Command Center, the college map and every school page like anywhere else.
   */
  const { isLoading: authLoading } = useAuth()
  const isCoach = classifyViewer(profile).isCollegeCoach
  const noChatPage = NO_CHAT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
  const chat =
    noChatPage || isCoach || authLoading ? null : onScoutPage(path) ? (path.startsWith("/my-recruiting/scout") ? null : <ScoutLauncher />) : <AIChatWidget />
  const familyBand = isCoach ? null : familyBandAt(path)
  const isSpartanCampaign = path === "/spartan" || path.startsWith("/spartan/")
  /*
   * The national recruiting site's front door (recruitwrestlers.com, served from app/recruitwrestlers):
   * its own page top to bottom. Nothing of NC United, no coach portal frame, no chat launcher - for
   * a coach or an admin too, since this is the page a stranger sees.
   */
  /*
   * On recruitwrestlers.com the address bar says "/" (middleware rewrites it to this page), and the
   * browser's path is what this frame reads once the page is running - so a path check alone drew
   * the NC United menu around the national homepage there. The domain decides it as well.
   */
  const onNationalDomain = typeof window !== "undefined" && isNationalHost(window.location.hostname)
  // The homepage draws its own header; every other page on that address gets RecruitWrestlers' frame below.
  const onGuildDomain = typeof window !== "undefined" && window.location.hostname === "recruit.wrestlingguild.com"
  /*
   * The <head> script marks the brand address before first paint; a rewritten front page ("/" is
   * served from /guild-recruiting) re-renders <html> on load and drops it. Put it back.
   */
  useEffect(() => {
    const brand = window.location.hostname === "recruit.wrestlingguild.com" ? "guild" : isNationalHost(window.location.hostname) ? "national" : null
    if (brand && document.documentElement.getAttribute("data-host") !== brand) document.documentElement.setAttribute("data-host", brand)
  }, [path])
  // Brand front pages draw their own header: RecruitWrestlers' and Guild Recruiting's, and Guild's holding page.
  const isNationalHome =
    ((onNationalDomain || onGuildDomain) && path === "/") ||
    path === "/recruitwrestlers" ||
    path.startsWith("/recruitwrestlers/") ||
    path === "/guild-recruiting" ||
    path.startsWith("/guild-recruiting/")
  if (isNationalHome) {
    return (
      <div id="app-content" className="relative flex min-h-screen flex-col bg-[#0A1628]">
        <main className="flex-1">{children}</main>
      </div>
    )
  }
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
      {/*
        Both frames are drawn; the address decides which shows (app/recruit-brand.css), set before
        the first paint - so recruitwrestlers.com never flashes NC United's menu, and nothing about
        app.ncwrestlingunited.com changes.
      */}
      <div className="ncu-only">
        <Navbar />
      </div>
      <BrandHeader />
      <div className="ncu-only">{familyBand === "top" ? <FamilyProfileBand /> : null}</div>
      <main className="flex-1">
        <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
      </main>
      <div className="ncu-only">
        {familyBand === "foot" ? <FamilyProfileBand /> : null}
        <Footer />
        {chat}
      </div>
      <BrandFooter />
    </div>
  )
}
