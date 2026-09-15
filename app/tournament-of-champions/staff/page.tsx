import type { Metadata } from "next"

import { TOC_FLO_URL } from "@/lib/toc/constants"

export const metadata: Metadata = {
  title: "Tournament Staff | Tournament of Champions 2026",
  description: "Scripts, check-in tools and schedules for NC United Tournament of Champions staff and volunteers.",
  robots: { index: false, follow: false },
}

/**
 * One bookmark for everyone running the tournament.
 *
 * Staff and volunteers were getting a separate link for every tool, texted at different times and
 * buried by Friday. This page is the menu: open to anyone with the link (volunteers have no
 * accounts), unlisted and not indexed. Tools holding private data keep their own sign-in.
 */

type HubLink = { href: string; title: string; detail: string; signIn?: boolean; external?: boolean }

const GROUPS: { id: string; title: string; when: string; links: HubLink[] }[] = [
  {
    id: "friday",
    title: "Friday",
    when: "September 18 · weigh-ins 4:00 · opening 5:30 · first whistle 6:00",
    links: [
      { href: "/admin/toc/weigh-ins", title: "Weigh-in check-in", detail: "4:00–5:00 PM · weight, skin check, lanyard, who is missing", signIn: true },
      { href: "/tournament-of-champions/staff/opening-ceremony", title: "Opening ceremony script", detail: "5:30 PM · Pastor Jason Gore — timeline, welcome, logistics, prayer" },
      { href: "/admin/toc/coaches", title: "Corner coach check-in", detail: "Who is credentialed for which wrestler", signIn: true },
      { href: "/run-sheet", title: "Weekend run sheet", detail: "Crew timeline, setup through clean-up", signIn: true },
    ],
  },
  {
    id: "saturday",
    title: "Saturday",
    when: "September 19 · wrestling 9:00 · Giving Hour 2:30 · finals 4:00",
    links: [
      { href: "/tournament-of-champions/staff/giving-hour", title: "Giving Hour script", detail: "2:30 PM · Caden Perry Scholarship, raffles and sponsors, with Drawn checkboxes" },
      { href: "/admin/toc/field", title: "Field & brackets", detail: "Official draws and seeds", signIn: true },
    ],
  },
  {
    id: "anytime",
    title: "Anytime",
    when: "Reference for both days",
    links: [
      { href: "/tournament-of-champions#know-before-you-go", title: "Know before you go", detail: "Arrival, weigh-ins, bags, restrooms, food, wristbands" },
      { href: "/tournament-of-champions#schedule", title: "Official schedule", detail: "Friday and Saturday timeline" },
      { href: "/tournament-of-champions/field", title: "The field", detail: "Every wrestler by weight, with corner coach status" },
      { href: TOC_FLO_URL, title: "Watch on FloWrestling", detail: "Live stream and replays", external: true },
    ],
  },
]

export default function TournamentStaffHubPage() {
  return (
    <main className="min-h-screen bg-[#0A1628] pb-20 text-white">
      <header className="border-b border-[#D3B574]/30 px-4 py-5">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D3B574]">NC United · Tournament of Champions</p>
          <h1 className="mt-1 text-3xl font-extrabold">Tournament Staff</h1>
          <p className="mt-2 text-sm text-white/60">Everything staff and volunteers need, in one place. Please don&rsquo;t share this link publicly.</p>
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Jump to day">
            {GROUPS.map((group) => (
              <a key={group.id} href={`#${group.id}`} className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/80 hover:border-[#D3B574] hover:text-[#D3B574]">
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-6">
        {GROUPS.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-4">
            <h2 className="text-2xl font-extrabold">{group.title}</h2>
            <p className="text-sm text-white/55">{group.when}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-[#D3B574]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D3B574]"
                  >
                    <span className="min-w-0">
                      <span className="block text-lg font-bold leading-tight">{link.title}</span>
                      <span className="block text-sm text-white/60">{link.detail}</span>
                    </span>
                    {link.signIn ? (
                      <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70">Staff sign-in</span>
                    ) : (
                      <span aria-hidden className="shrink-0 text-[#D3B574]">→</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
