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
        <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#C8A94A]/95")}`}>Coming soon</p>
        <h3
          id="fundraising-scholarships-heading"
          className={`${displayFont("mt-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl")}`}
        >
          Training scholarships
        </h3>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/72">
          Not part of today&apos;s giving checkout — NC United will open need- and merit-based scholarships later. Leave your email to hear when
          applications and funding details go live.
        </p>
        <div className="mx-auto mt-8 w-full max-w-lg">
          <ScholarshipsInterestNotifyCard />
        </div>
      </div>
    </section>
  )
}
