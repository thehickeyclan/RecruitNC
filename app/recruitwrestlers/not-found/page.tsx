/**
 * RecruitWrestlers' "page not found", for any address recruitwrestlers.com does not serve and NC
 * United does not own (middleware.ts). It used to forward to NC United's sign-in page.
 */
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: { absolute: "Page not found | RecruitWrestlers" }, robots: { index: false, follow: false } }

const LINKS = [
  { href: "/prospects/all", label: "Athletes" },
  { href: "/public-rankings", label: "Rankings" },
  { href: "/recaps", label: "News" },
  { href: "/membership", label: "Plans" },
  { href: "/auth/signup?type=college-coach", label: "College coaches" },
]

export default function RecruitWrestlersNotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0B1426] px-4 py-16 text-center text-white">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">404</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">That page isn&apos;t here.</h1>
      <p className="mt-4 max-w-md text-[#A8B3C5]">The address may be old or mistyped. Try one of these, or search for a wrestler from Athletes.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#A3E635] hover:text-[#A3E635]">
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  )
}
