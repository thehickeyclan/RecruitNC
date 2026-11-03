import { PoweredByRw } from "@/components/recruiting/powered-by-rw"
import Link from "next/link"

import { unreadCount } from "@/lib/coach-messages"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { Activity, BookOpen, CalendarDays, ClipboardList, Compass, GraduationCap, LayoutDashboard, Map as MapIcon, MessageSquare, Scale, Send, Sparkles } from "lucide-react"

/**
 * The family portal's frame (Matt's design, 14 Oct 2026): one menu down the left on a computer, a
 * scrolling bar of the same items on a phone. Every Command Center page sits inside it, so a
 * family always knows where they are and how to get to the rest.
 */
export type PortalSection = "home" | "plan" | "colleges" | "map" | "messages" | "scout" | "learn" | "activity" | "forms" | "rules" | "reach" | "commit"

type Item = { key: PortalSection; label: string; href: string; icon: typeof Activity }

/**
 * The menu follows the recruiting path (Matt, 28 Oct 2026): the five steps in order, then Scout
 * and Learn as helpers. A step with one tool is that tool, numbered; a step label above a single
 * item only repeated it ("4 Reach out" over "Reach out", Matt 2 Nov). Steps with more than one
 * tool keep a numbered heading with their tools under it.
 */
type Group = { step: number | null; name: string | null; items: Item[] }
const GROUPS: Group[] = [
  { step: null, name: null, items: [{ key: "home", label: "Command Center", href: "/my-recruiting", icon: LayoutDashboard }] },
  { step: 1, name: "Research", items: [{ key: "map", label: "College map", href: "/recruiting/college-map", icon: MapIcon }] },
  { step: 2, name: "Select", items: [{ key: "colleges", label: "My List", href: "/my-recruiting/colleges", icon: Compass }] },
  { step: 3, name: "Rules", items: [{ key: "rules", label: "Rules and timing", href: "/my-recruiting/rules", icon: Scale }] },
  {
    step: 4,
    name: "Reach out",
    items: [
      { key: "reach", label: "College checklist", href: "/my-recruiting/reach-out", icon: Send },
      { key: "forms", label: "Interest forms", href: "/my-recruiting/questionnaires", icon: ClipboardList },
    ],
  },
  {
    step: 5,
    name: "Monitor",
    items: [
      { key: "activity", label: "Activity", href: "/my-recruiting/activity", icon: Activity },
      { key: "messages", label: "Messages", href: "/inbox", icon: MessageSquare },
      { key: "plan", label: "Schedule and visits", href: "/my-recruiting/plan", icon: CalendarDays },
    ],
  },
  // The end of the path: the family hears first, so the family announces it (Matt, 3 Nov 2026).
  // Unnumbered, like Help: the path is five steps everywhere else (tour, home cards, Learn).
  { step: null, name: "Commit", items: [{ key: "commit", label: "Announce a commitment", href: "/submit-commitment", icon: GraduationCap }] },
  {
    step: null,
    name: "Help",
    items: [
      { key: "scout", label: "Scout", href: "/my-recruiting/scout", icon: Sparkles },
      { key: "learn", label: "Learn", href: "/my-recruiting/learn", icon: BookOpen },
    ],
  },
]
const ITEMS: Item[] = GROUPS.flatMap((g) => g.items)

export async function PortalShell({ active, children }: { active: PortalSection; children: React.ReactNode }) {
  // Unread recruiting messages, shown on Messages in the menu. A failure shows no badge, never an error.
  const unread = await (async () => {
    const { data } = await (await createClient()).auth.getUser()
    return data.user ? unreadCount(createAdminClient(), data.user.id).catch(() => 0) : 0
  })().catch(() => 0)
  const badge = (key: PortalSection) =>
    key === "messages" && unread > 0 ? <span className="ml-auto rounded-full bg-[#D3B574] px-1.5 text-[10px] font-black text-[#0A1628]">{unread}</span> : null
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <nav aria-label="Command Center" className="sticky top-0 z-30 border-b border-white/10 bg-[#0A1628]/95 backdrop-blur lg:hidden">
        <ul className="flex gap-1 overflow-x-auto px-3 py-2">
          {ITEMS.map(({ key, label, href, icon: Icon }) => (
            <li key={key} className="shrink-0">
              <Link
                href={href}
                aria-current={key === active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${key === active ? "bg-[#D3B574] text-[#0A1628]" : "text-white/70 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
                {badge(key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/10 px-3 py-6 lg:flex">
          <p className="px-3 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Recruiting Portal</p>
          <div className="mt-4 space-y-3 overflow-y-auto">
            {GROUPS.map((g) => {
              const single = g.step !== null && g.items.length === 1
              return (
                <div key={g.name ?? "home"}>
                  {g.step !== null && !single ? (
                    <p className="flex items-center gap-3 px-3 pb-1 text-sm font-semibold text-white/80">
                      <StepNumber n={g.step} /> {g.name}
                    </p>
                  ) : g.name && g.step === null ? (
                    <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-white/35">{g.name}</p>
                  ) : null}
                  <ul className="space-y-0.5">
                    {g.items.map(({ key, label, href, icon: Icon }) => (
                      <li key={key}>
                        <Link
                          href={href}
                          aria-current={key === active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${g.step !== null && !single ? "pl-6" : ""} ${key === active ? "bg-[#D3B574]/15 text-white ring-1 ring-[#D3B574]/50" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
                        >
                          {single ? <StepNumber n={g.step as number} active={key === active} /> : <Icon className={`h-4 w-4 ${key === active ? "text-[#D3B574]" : ""}`} aria-hidden />}
                          {label}
                          {badge(key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <PoweredByRw className="mt-auto shrink-0 px-3 pt-3" />
          <Link href="/profile" className="mt-3 shrink-0 px-3 text-xs font-semibold text-white/45 hover:text-white">
            Account settings
          </Link>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

/** The step's number in a small ring, in place of an icon. */
function StepNumber({ n, active = false }: { n: number; active?: boolean }) {
  return (
    <span
      aria-label={`Step ${n}`}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${active ? "bg-[#D3B574] text-[#0A1628]" : "ring-1 ring-white/30 text-white/70"}`}
    >
      {n}
    </span>
  )
}
