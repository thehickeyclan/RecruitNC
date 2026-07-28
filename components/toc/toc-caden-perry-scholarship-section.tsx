import { HeartHandshake, ReceiptText, ShieldCheck } from "lucide-react"

import { HardLink } from "@/components/hard-link"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP } from "@/lib/toc/constants"

const highlights = [
  {
    icon: ShieldCheck,
    title: "Open beyond the TOC field",
    body: "The recipient does not have to compete in Tournament of Champions. Caden's legacy is bigger than one bracket.",
  },
  {
    icon: HeartHandshake,
    title: "Built around adversity",
    body: "This recognizes a wrestler's response when life gets hard — courage, character, and the refusal to quit.",
  },
  {
    icon: ReceiptText,
    title: "$1,000 wrestling support",
    body: "Funds are for documented wrestling-related expenses, paid directly or reimbursed with receipts.",
  },
] as const

export function TocCadenPerryScholarshipSection() {
  const s = TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP

  return (
    <section id="caden-perry-scholarship" className="relative overflow-hidden bg-[#061224] text-white scroll-mt-20">
      <TocPatrioticBar />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(215,185,90,0.42), transparent 30%), radial-gradient(circle at 86% 28%, rgba(204,0,0,0.32), transparent 28%)",
        }}
        aria-hidden
      />

      <div className="container relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className={`mb-2 text-sm uppercase tracking-[0.22em] text-[#D7B95A] ${tocDisplayClass()}`}>
              {s.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="max-w-3xl text-white leading-none lg:text-6xl">
              {s.headline}
            </TocVarsityHeading>
            <p className="mt-5 max-w-2xl text-xl italic leading-relaxed text-[#D7B95A] sm:text-2xl">
              “{s.tagline}”
            </p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">{s.lead}</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/72 sm:text-lg">{s.award}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/68 sm:text-base">{s.seedCommitment}</p>
            <p className="mt-4 max-w-2xl border-l-4 border-[#CC0000] pl-4 text-sm leading-relaxed text-white/68 sm:text-base">
              {s.notAbout}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <HardLink
                href={s.href}
                className={`inline-flex min-h-12 items-center justify-center rounded-sm bg-[#CC0000] px-6 text-center text-base font-semibold text-white shadow-lg hover:bg-[#a80000] ${tocDisplayClass()}`}
              >
                Scholarship details
              </HardLink>
              <HardLink
                href={s.donateHref}
                className={`inline-flex min-h-12 items-center justify-center rounded-sm border-2 border-[#D7B95A]/70 bg-[#D7B95A]/10 px-6 text-center text-base font-semibold text-[#f5e6b8] hover:bg-[#D7B95A]/20 ${tocDisplayClass()}`}
              >
                Support the fund
              </HardLink>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#D7B95A]/35 bg-white/[0.07] p-5 shadow-2xl sm:p-6">
              <p className={`text-sm uppercase tracking-[0.2em] text-[#D7B95A] ${tocDisplayClass()}`}>
                What the award supports
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/72">{s.fundUseIntro}</p>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/82">
                {s.fundUses.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D7B95A]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {highlights.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-xl border border-white/10 bg-[#0B2545]/55 p-4">
                  <Icon className="h-5 w-5 text-[#D7B95A]" aria-hidden />
                  <h3 className={`mt-3 text-xl leading-none text-white ${tocDisplayClass()}`}>{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/68">{body}</p>
                </article>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm leading-relaxed text-white/75">{s.eligibility}</p>
              <p className="mt-3 text-sm font-semibold text-[#D7B95A]">{s.dates}</p>
            </div>
          </div>
        </div>
      </div>

      <TocPatrioticBar />
    </section>
  )
}
