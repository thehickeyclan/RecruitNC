import Link from "next/link"
import { ArrowRight, Home, Search, Star, UserPlus } from "lucide-react"
import { isPlaceholderAthletePhoto } from "@/lib/recruiting-profile-photo"
import type { ViewerKind } from "@/lib/viewer-role"

export type MyWrestler = {
  id: string
  name: string
  classYear: number | null
  school: string | null
  photo: string | null
  relationship: "self" | "parent"
}

/** Who opened the page. Decides what an account with no wrestler is offered. */
export type ProfileAudience = Exclude<ViewerKind, "anonymous">

const GOLD = "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#D3B574] px-4 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]"
const OUTLINE = "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/25 px-4 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]"

/** The heading, the line under it and the buttons for an account no wrestler is attached to. */
function emptyState(audience: ProfileAudience): { title: string; body: string; actions: Array<{ href: string; label: string; icon: typeof Search; gold?: boolean }> } {
  switch (audience) {
    // A college coach reaches this page as "My Account". The coach is never asked to claim a profile.
    case "college_coach":
      return {
        title: "My Account",
        body: "Your recruiting is on Coach Home and My Recruits. Your account details are below.",
        actions: [
          { href: "/coach-home", label: "Coach Home", icon: Home, gold: true },
          { href: "/my-recruits", label: "My Recruits", icon: Star },
          { href: "/prospects/all", label: "Athletes", icon: Search },
        ],
      }
    case "hs_coach":
      return {
        title: "Your athletes",
        body: "Find your athletes' profiles, or add one that is missing.",
        actions: [
          { href: "/prospects/all", label: "Find an athlete", icon: Search, gold: true },
          { href: "/create-profile", label: "Add an athlete", icon: UserPlus },
        ],
      }
    case "parent":
      return {
        title: "Find your wrestler",
        body: "Your account is not linked to your wrestler yet. Find their profile and claim it, or create one.",
        actions: [
          { href: "/prospects/all", label: "Find your wrestler", icon: Search, gold: true },
          { href: "/create-profile", label: "Create a profile", icon: UserPlus },
        ],
      }
    case "athlete":
      return {
        title: "Find your profile",
        body: "Your account is not linked to your profile yet. Find it and claim it, or create one.",
        actions: [
          { href: "/prospects/all", label: "Find your profile", icon: Search, gold: true },
          { href: "/create-profile", label: "Create a profile", icon: UserPlus },
        ],
      }
    default:
      // Fans, admins and accounts with no role: most "other" accounts here are families who never
      // picked one, so claiming stays on offer.
      return {
        title: "Find a wrestler",
        body: "Looking for your own or your child's profile? Find it and claim it, or create one.",
        actions: [
          { href: "/prospects/all", label: "Find a wrestler", icon: Search, gold: true },
          { href: "/create-profile", label: "Create a profile", icon: UserPlus },
        ],
      }
  }
}

/**
 * The top of /profile: the wrestler this account belongs to, one tap from his profile.
 *
 * Nine in ten people who open /profile are after a wrestler's profile, not their account (Matt,
 * 14 October 2026). Over three weeks 125 people opened it - 54 athletes and 44 parents, 50 of them
 * owning a profile and 52 linked to one as a parent - and the most common thing they did next was
 * open a wrestler's profile. So the page leads with theirs, and the account settings follow.
 */
export function MyWrestlers({ wrestlers, audience }: { wrestlers: MyWrestler[]; audience: ProfileAudience }) {
  const empty = emptyState(audience)
  return (
    <section className="bg-[#0A1628] px-4 pb-6 pt-6 text-white" aria-labelledby="my-wrestlers">
      <div className="mx-auto max-w-3xl">
        <h1 id="my-wrestlers" className="text-2xl font-black tracking-tight sm:text-3xl">
          {wrestlers.length > 1 ? "Your wrestlers" : wrestlers.length === 1 ? (wrestlers[0]!.relationship === "self" ? "Your profile" : "Your wrestler") : empty.title}
        </h1>

        {wrestlers.length ? (
          <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3">
            {wrestlers.map((w) => (
              <li key={w.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-3 sm:gap-4 sm:p-4">
                <Link href={`/view-profile?id=${encodeURIComponent(w.id)}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={w.photo && !isPlaceholderAthletePhoto(w.photo) ? w.photo : "/wrestler-silhouette.png"}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg bg-[#13294B] object-cover sm:h-20 sm:w-20"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-black">{w.name}</span>
                    <span className="block truncate text-sm text-white/60">
                      {[w.classYear ? `Class of ${w.classYear}` : null, w.school].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/view-profile?id=${encodeURIComponent(w.id)}`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#D3B574] px-3 text-sm font-bold sm:px-4 text-[#0A1628] hover:bg-[#e2c98d]"
                  >
                    Open<span className="hidden sm:inline">&nbsp;profile</span> <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
            <p className="text-sm text-white/70">{empty.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {empty.actions.map(({ href, label, icon: Icon, gold }) => (
                <Link key={href} href={href} className={gold ? GOLD : OUTLINE}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {wrestlers.length > 0 ? (
        <Link href="/prospects/all" className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#D3B574] hover:underline">
          <Search className="h-4 w-4" /> Looking for another wrestler? Browse every athlete <ArrowRight className="h-4 w-4" />
        </Link>
        ) : null}
      </div>
    </section>
  )
}
