"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import { Trophy, Users, Mail, Handshake, UserCheck, UserPlus, GraduationCap, LayoutGrid, Scale, HandHeart, Newspaper, ClipboardList } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type CountKey = "nominations" | "sponsors" | "media" | "volunteers" | "email" | "users" | "collegeCoaches"
type DashboardCounts = Record<CountKey, number>
type DashboardLink = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  external?: boolean
  countKey?: CountKey
}

const LINKS: DashboardLink[] = [
  {
    href: "/admin/toc/plan",
    title: "Project plan",
    description: "Shared TOC task board — owners, status, budget, notes, links, attachments",
    icon: ClipboardList,
  },
  {
    href: "/admin/toc/invitations",
    title: "Invitations",
    description: "Invite athletes, track who hasn’t accepted, mark declined, refresh confirm windows",
    icon: UserCheck,
  },
  {
    href: "/admin/toc/field",
    title: "Field & brackets",
    description: "Track wrestlers by weight, seed, publish official draws",
    icon: LayoutGrid,
  },
  {
    href: "/admin/toc/compare",
    title: "Athlete compare",
    description: "Head-to-head, state, NHSCA, Duals, Super32 — seeding recommendation",
    icon: Scale,
  },
  {
    href: "/admin/toc/college-coaches",
    title: "College coaches",
    description: "Registration, credentials and outreach roster",
    icon: GraduationCap,
    countKey: "collegeCoaches",
  },
  {
    href: "/admin/toc/nominations",
    title: "Prospect interest",
    description: "Athlete interest forms — name, weight, school, club",
    icon: Users,
    countKey: "nominations",
  },
  {
    href: "/admin/toc/sponsors",
    title: "Sponsors",
    description: "Sponsor inquiry pipeline",
    icon: Handshake,
    countKey: "sponsors",
  },
  {
    href: "/admin/toc/media",
    title: "Media requests",
    description: "Credentials & coverage pipeline",
    icon: Newspaper,
    countKey: "media",
  },
  {
    href: "/admin/toc/volunteers",
    title: "Volunteers",
    description: "Volunteer interest signups",
    icon: HandHeart,
    countKey: "volunteers",
  },
  {
    href: "/admin/toc/email",
    title: "Email list",
    description: "Subscribers + CSV export",
    icon: Mail,
    countKey: "email",
  },
  {
    href: "/admin/users-dashboard",
    title: "Users",
    description: "New platform registrations from the last seven days",
    icon: UserPlus,
    countKey: "users",
  },
  {
    href: "/tournament-of-champions/brackets",
    title: "Public brackets",
    description: "Published weight-class draws",
    icon: LayoutGrid,
    external: true,
  },
  {
    href: "/tournament-of-champions",
    title: "Public page",
    description: "View marketing landing page",
    icon: Trophy,
    external: true,
  },
]

const EMPTY_COUNTS: DashboardCounts = {
  nominations: 0,
  sponsors: 0,
  media: 0,
  volunteers: 0,
  email: 0,
  users: 0,
  collegeCoaches: 0,
}

export default function TocAdminHubPage() {
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS)

  useEffect(() => {
    let active = true
    fetch("/api/admin/toc/dashboard-counts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load TOC dashboard counts")
        return response.json() as Promise<{
          counts?: Partial<DashboardCounts>
        }>
      })
      .then((payload) => {
        if (active) setCounts({ ...EMPTY_COUNTS, ...payload.counts })
      })
      .catch((error) => console.error("[RecruitNC] TOC dashboard counts", error))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tournament of Champions</h1>
        <p className="text-muted-foreground mt-1">Project plan, invitations, field, athlete compare, prospect interest, sponsors, media, volunteers, email list</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map(({ href, title, description, icon: Icon, external, countKey }) => {
          const count = countKey ? counts[countKey] : 0
          return (
            <Card key={href} className="hover:border-[#002147]/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[#002147]" />
                  <CardTitle className="text-lg">
                    {external ? (
                      <HardLink href={href} className="hover:underline">
                        {title}
                      </HardLink>
                    ) : (
                      <HardLink href={href} className="hover:underline">
                        {title}
                      </HardLink>
                    )}
                  </CardTitle>
                  {count > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#B31B1B] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white" aria-label={`${count} new ${title.toLowerCase()}`}>
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                {external ? (
                  <HardLink href={href} className="text-sm text-[#B31B1B] font-medium">
                    Open →
                  </HardLink>
                ) : (
                  <HardLink href={href} className="text-sm text-[#B31B1B] font-medium">
                    Manage →
                  </HardLink>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
