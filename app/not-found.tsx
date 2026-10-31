/**
 * "Page not found" for every notFound() and unknown address.
 *
 * There was none, so Next's default was all anyone saw - and inside this layout that rendered as
 * an empty page between the header and the footer: NC United's /recaps and /for-coaches (pages
 * that belong to RecruitWrestlers) looked broken rather than absent (mobile review, 30 Oct 2026).
 * On recruitwrestlers.com it is that site's own page.
 */
import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"

import RecruitWrestlersNotFound from "@/app/recruitwrestlers/not-found/page"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"

export const metadata: Metadata = { title: { absolute: "Page not found" }, robots: { index: false, follow: false } }

const LINKS = [
  { href: "/prospects/all", label: "Athletes" },
  { href: "/college-commitments", label: "Commitments" },
  { href: "/rankings", label: "Rankings" },
  { href: "/news", label: "News" },
  { href: "/create-profile", label: "Claim a profile" },
]

export default async function NotFound() {
  if (stagedBrandForHost((await headers()).get("host")) === "national") return <RecruitWrestlersNotFound />
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4 py-16 text-center text-foreground">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">404</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">That page isn&apos;t here.</h1>
      <p className="mt-4 max-w-md text-muted-foreground">The address may be old or mistyped. Try one of these, or search for a wrestler from Athletes.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex min-h-[44px] items-center rounded-full border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary">
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  )
}
