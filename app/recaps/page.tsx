/**
 * RecruitWrestlers' recaps (Matt, 26 Oct 2026): every state's Super 32 recap in one place, North
 * Carolina's and South Carolina's so far. recruitwrestlers.com addresses only; NC United has its own
 * recaps in its News.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

const isRwHost = (host: string) => /recruitwrestlers\.com$|^localhost|\.vercel\.app$/.test(host.toLowerCase())

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? ""
  if (!isRwHost(host)) return { title: { absolute: "Page not found" }, robots: { index: false, follow: false } }
  return { title: { absolute: "Super 32 2026 Recaps | RecruitWrestlers" }, description: "How every state's wrestlers did at Super 32 2026, graded on the strength of their tournament." }
}

const RECAPS = [
  { href: "/recaps/super32-2026-nc-boys", state: "North Carolina", title: "Boys recap", line: "11 wins over top-15 seeds, up from 6 and 2. Braylen Yates medaled.", img: "/images/news/super32-2026-boys-recap/share-card.jpg" },
  { href: "/recaps/super32-2026-nc-girls", state: "North Carolina", title: "Girls recap", line: "Lauren Samuel and Ella Taylor both finished 3rd.", img: "/images/news/super32-2026-girls-recap/share-card.jpg" },
  { href: "/recaps/super32-2026-sc", state: "South Carolina", title: "Boys recap", line: "Nine winning records and a win over the NHSCA national champion.", img: "/recruitwrestlers/recaps/sc-share-card.jpg" },
]

export default async function RecapsIndex() {
  if (!isRwHost((await headers()).get("host") ?? "")) notFound()
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A3E635]">RecruitWrestlers · Super 32 2026</div>
      <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">State recaps</h1>
      <p className="mt-1 text-sm text-[#A8B3C5]">Every wrestler graded on who he or she beat, how far they went and who beat them. More states coming.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {RECAPS.map((r) => (
          <Link key={r.href} href={r.href} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#15243B] hover:border-[#A3E635]/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.img} alt="" className="h-40 w-full object-cover object-center" />
            <div className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#A3E635]">{r.state}</div>
              <div className="mt-0.5 text-lg font-black text-white group-hover:underline">{r.title}</div>
              <div className="mt-1 text-sm text-[#A8B3C5]">{r.line}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
