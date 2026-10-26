/**
 * RecruitWrestlers' Contact page, at www.recruitwrestlers.com/contact (middleware rewrites it here).
 * NC United keeps its own /contact. Email only for now: NC United's contact form delivers to NC
 * United's inbox, and where RecruitWrestlers messages go is Matt's call.
 */
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: { absolute: "Contact | RecruitWrestlers" },
  description: "Questions about RecruitWrestlers, Insider, the Recruiting Command Center or coach access.",
}

const TOPICS: Array<{ title: string; body: string; href?: string; cta?: string }> = [
  { title: "Families", body: "Claiming a profile, fixing a result, Insider or the Recruiting Command Center.", href: "/membership", cta: "See the plans" },
  { title: "College coaches", body: "Free coach access, My Recruits, reports and messaging.", href: "/auth/signup?type=college-coach", cta: "Get free coach access" },
  { title: "Partners", body: "License Insider or the Recruiting Command Center for your club, state or organization." },
  { title: "A result or profile is wrong", body: "Tell us the wrestler, the event and what should change. Every result on the site is computed from brackets, so we check it against the source." },
]

export default function RecruitWrestlersContact() {
  return (
    <main className="min-h-screen bg-[#0B1426] px-4 py-14 text-white sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">Contact</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">We read every message.</h1>
        <p className="mt-4 text-lg text-[#A8B3C5]">
          Email{" "}
          <a href="mailto:info@recruitwrestlers.com" className="font-semibold text-[#A3E635] underline">
            info@recruitwrestlers.com
          </a>{" "}
          and a person answers, usually within a day.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-white/10 bg-[#15243B] p-5">
              <p className="text-sm font-black uppercase tracking-wider text-white">{t.title}</p>
              <p className="mt-2 text-sm text-[#A8B3C5]">{t.body}</p>
              {t.href ? (
                <Link href={t.href} className="mt-3 inline-block text-sm font-semibold text-[#A3E635] underline">
                  {t.cta} →
                </Link>
              ) : (
                <a href="mailto:info@recruitwrestlers.com?subject=Partnership" className="mt-3 inline-block text-sm font-semibold text-[#A3E635] underline">
                  Email us about a partnership →
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-[#A8B3C5]">RecruitWrestlers, a Guild Ventures company.</p>
      </div>
    </main>
  )
}
