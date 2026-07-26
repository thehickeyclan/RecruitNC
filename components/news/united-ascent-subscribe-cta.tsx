import Link from "next/link"
import { UnitedAscentEmailSubscribeForm } from "@/components/news/united-ascent-email-subscribe-form"

export function UnitedAscentSubscribeCta() {
  return (
    <div className="not-prose rounded-2xl border border-[#D3B574]/50 bg-[#0A1628] p-5 text-white shadow-lg sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D3B574]">
        Get United Ascent Weekly
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-white">
        Want North Carolina wrestling news in your inbox?
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
        Subscribe with just your email. Create a RecruitNC account only when you want protected tools like rankings,
        profile management, wallet, TOC actions, and recruiting features.
      </p>
      <div className="mt-5 max-w-2xl">
        <UnitedAscentEmailSubscribeForm source="united_ascent_article_cta" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/news/united-ascent"
          className="inline-flex rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white no-underline transition hover:border-[#D3B574] hover:text-[#D3B574]"
        >
          View All United Ascent Issues
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white/75 no-underline transition hover:border-[#D3B574] hover:text-[#D3B574]"
        >
          Create RecruitNC Account
        </Link>
      </div>
    </div>
  )
}
