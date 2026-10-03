"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import {
  BarChart3,
  ClipboardList,
  FileText,
  GraduationCap,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react"

/**
 * The first thing somebody sees after their account becomes real.
 *
 * A coach used to finish sign-up on a rankings table, which teaches them this site is a rankings
 * table: 44 of them had full access for months and not one ever opened a scouting report, because
 * nothing pointed at one. Everyone else lands somewhere equally silent — an athlete verifies their
 * email and is returned to a page with no mention of the profile they came here to build.
 *
 * So each role gets told the two or three things worth doing, in its own words. Three at most: a
 * fourth dilutes the rest, and the point is a starting place rather than a tour.
 *
 * Shown from `?welcome=<role>`, set by the e-mail verification callback and by the coach sign-up
 * redirect. That makes it first-run by construction rather than by remembering — no flag to store,
 * nothing to migrate, no way to reappear on an ordinary visit. Dismissing strips the parameter.
 */

type Destination = {
  href: string
  icon: typeof BarChart3
  title: string
  body: string
}

type Welcome = {
  heading: string
  intro: string
  destinations: Destination[]
  /** The one line worth saying that is not a link. */
  footnote?: { title: string; body: string }
}

const RANKINGS: Destination = {
  href: "/rankings",
  icon: BarChart3,
  title: "Rankings",
  body: "Every class ranked, and the Top 75 College Prospects board across the classes.",
}

const COMMITS: Destination = {
  href: "/athletes",
  icon: GraduationCap,
  title: "College commitments",
  body: "Who has signed where, this class and last.",
}

const PROFILES: Destination = {
  href: "/prospects/all",
  icon: Users,
  title: "Athlete profiles",
  body: "All 500+ wrestlers, filterable by class, weight, school and credential. Results verified from source.",
}

/**
 * What each role is told. Keyed on the normalised role, with a fallback for everyone else.
 *
 * Nothing here promises a thing the account does not already have. An athlete is pointed at the
 * subscription page to read what it includes, not told that colleges are watching them.
 */
const WELCOMES: Record<string, Welcome> = {
  college_coach: {
    heading: "You're in, Coach",
    intro: "Full access, no charge. Here is where North Carolina's wrestlers actually live.",
    destinations: [RANKINGS, PROFILES, COMMITS],
    footnote: {
      title: "Scouting reports are included.",
      body: "Open any wrestler and export a one-page dossier — results, significant wins and losses, strength of competition. Free to college staff.",
    },
  },

  athlete: {
    heading: "Welcome — now build your page",
    intro:
      "College coaches read these profiles. Most of what they look for takes a few minutes to fill in.",
    destinations: [
      {
        href: "/create-profile",
        icon: UserPlus,
        title: "Claim or create your profile",
        body: "We may already have one built from your results — search your name first so you do not end up with two.",
      },
      RANKINGS,
      {
        href: "/rankings",
        icon: ClipboardList,
        title: "Full access",
        body: "What a membership adds: every class ranking, and which college programs have viewed your profile.",
      },
    ],
    footnote: {
      title: "Film and GPA are what is missing.",
      body: "They are the first two things a coach asks for after your record, and only you can add them.",
    },
  },

  parent: {
    heading: "Welcome — start with your wrestler",
    intro: "Link your wrestler and you can manage their profile, which is what college coaches read.",
    destinations: [
      {
        href: "/create-profile",
        icon: UserPlus,
        title: "Find your wrestler",
        body: "Search their name first — most wrestlers already have a profile built from their results.",
      },
      RANKINGS,
      COMMITS,
    ],
    footnote: {
      title: "One account, both jobs.",
      body: "A parent can manage their wrestler's profile; the wrestler can claim their own. Neither cancels the other.",
    },
  },

  hs_coach: {
    heading: "Welcome, Coach",
    intro: "Your wrestlers' results are already here. This is how to keep up with them.",
    destinations: [
      PROFILES,
      RANKINGS,
      COMMITS,
    ],
    footnote: {
      title: "Scouting reports are for college staff.",
      body: "Everything else on the site is open to you, including every profile and every published board.",
    },
  },

  fan: {
    heading: "Welcome to NC United",
    intro: "North Carolina wrestling, kept current.",
    destinations: [
      RANKINGS,
      COMMITS,
      {
        href: "/prospects/all",
        icon: Trophy,
        title: "Athlete profiles",
        body: "Every wrestler we hold, with their results from the state tournament and the national events.",
      },
    ],
  },
}

const ROLE_ALIASES: Record<string, string> = {
  "college-coach": "college_coach",
  college_coach: "college_coach",
  coach: "hs_coach",
  "hs-club-coach": "hs_coach",
  hs_club_coach: "hs_coach",
  athlete: "athlete",
  parent: "parent",
  fan: "fan",
}

/** The sign-up redirect says "coach" and means a college one. */
function welcomeFor(raw: string): Welcome | null {
  const key = raw.trim().toLowerCase()
  if (!key) return null
  if (key === "coach") return WELCOMES.college_coach
  const normalised = ROLE_ALIASES[key] ?? key.replace(/-/g, "_")
  return WELCOMES[normalised] ?? WELCOMES.fan
}

/** "Welcome, Coach Juster" (Matt) - the coach's surname, from the account; generic until it loads. */
function headingFor(
  welcome: Welcome,
  asked: string | null,
  profile: { last_name?: string | null; full_name?: string | null } | null,
): string {
  const role = (asked ?? "").toLowerCase().replace(/-/g, "_")
  if (role !== "coach" && role !== "college_coach") return welcome.heading
  const surname = profile?.last_name?.trim() || profile?.full_name?.trim().split(/\s+/).slice(-1)[0] || ""
  return surname ? `Welcome, Coach ${surname}` : "Welcome, Coach"
}

export function WelcomeModal() {
  const [welcome, setWelcome] = useState<Welcome | null>(null)
  const [asked, setAsked] = useState<string | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    /*
     * Read the URL directly rather than through useSearchParams: this mounts in the root layout,
     * and that hook forces every page under it into a Suspense bailout.
     */
    if (typeof window === "undefined") return
    const asked = new URLSearchParams(window.location.search).get("welcome")
    if (asked) {
      setAsked(asked)
      setWelcome(welcomeFor(asked))
    }
  }, [])

  const dismiss = () => {
    setWelcome(null)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.delete("welcome")
    window.history.replaceState({}, "", url.toString())
  }

  if (!welcome) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#D3B574]/30 bg-[#0f1c2e] p-6 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D3B574]">NC United · RecruitNC</p>
        <h2 id="welcome-title" className="mt-2 pr-8 text-2xl font-black text-white">
          {headingFor(welcome, asked, profile)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{welcome.intro}</p>

        <div className="mt-5 space-y-3">
          {welcome.destinations.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={`${href}-${title}`}
              href={href}
              onClick={dismiss}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#D3B574]/50 hover:bg-white/10"
            >
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D3B574]" />
              <span>
                <span className="block text-sm font-bold text-white">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-white/60">{body}</span>
              </span>
            </Link>
          ))}
        </div>

        {welcome.footnote ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#D3B574]/30 bg-[#D3B574]/10 p-4">
            <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D3B574]" />
            <p className="text-xs leading-relaxed text-white/80">
              <span className="font-bold text-[#D3B574]">{welcome.footnote.title}</span>{" "}
              {welcome.footnote.body}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-lg bg-[#D3B574] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[#0A1628] transition-colors hover:bg-[#e2c98d]"
        >
          Start here
        </button>
      </div>
    </div>
  )
}
