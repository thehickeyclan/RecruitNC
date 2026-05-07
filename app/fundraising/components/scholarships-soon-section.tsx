import { HardLink } from "@/components/hard-link"

import { ScholarshipsInterestNotifyCard } from "./scholarships-interest-notify"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function ScholarshipsSoonSection() {
  return (
    <section
      id="fundraising-scholarships-soon"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#061224] px-4 py-14 text-white sm:py-16"
      aria-labelledby="fundraising-scholarships-heading"
    >
      <div className="mx-auto max-w-xl text-center">
        <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#C8A94A]/95")}`}>Scholarships</p>
        <h3
          id="fundraising-scholarships-heading"
          className={`${displayFont("mt-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl")}`}
        >
          NC United scholarship funds
        </h3>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/72">
          Named funds and applications live on the scholarships hub. Leave your email if you want a ping when new funds or deadlines post.
        </p>
        <div className="mx-auto mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
          <HardLink
            href="/fundraising/scholarships"
            className={`${displayFont(
              "inline-flex min-h-[48px] items-center justify-center rounded-sm bg-[#CC0000] px-8 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[#a80000]",
            )}`}
          >
            Scholarships hub →
          </HardLink>
        </div>
        <div className="mx-auto mt-8 w-full max-w-lg">
          <ScholarshipsInterestNotifyCard />
        </div>
      </div>
    </section>
  )
}
