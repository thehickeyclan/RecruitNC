import Link from "next/link"

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
        Create a free RecruitNC account and you’ll be added to the weekly United Ascent news list — our record of the people,
        performances and progress moving North Carolina wrestling forward.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/auth/signup"
          className="inline-flex rounded-xl bg-[#D3B574] px-5 py-3 text-sm font-bold text-[#071529] no-underline transition hover:bg-white"
        >
          Create Free Account
        </Link>
        <Link
          href="/news/united-ascent"
          className="inline-flex rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white no-underline transition hover:border-[#D3B574] hover:text-[#D3B574]"
        >
          View All United Ascent Issues
        </Link>
      </div>
    </div>
  )
}
