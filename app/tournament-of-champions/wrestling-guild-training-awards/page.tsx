import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

export const metadata: Metadata = {
  title: "Wrestling Guild Training Awards Rules | NC United",
  description:
    "Official rules for the Wrestling Guild training-credit awards — win up to $1,000 in training with current and former NCAA athletes — presented through the 2026 NC United Tournament of Champions partnership.",
}

const RULE_SECTIONS = [
  {
    title: "1. Promotion period",
    content: (
      <p>
        The Wrestling Guild Training Awards promotion begins August 9, 2026, and ends September 15, 2026. All eligible
        wrestler accounts must be created during this period.
      </p>
    ),
  },
  {
    title: "2. Eligibility",
    content: (
      <div className="space-y-3">
        <p>
          Every wrestler who creates a new, free Wrestling Guild wrestler account during the promotion period is
          automatically eligible. No purchase is necessary.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>One entry and no more than one award per wrestler.</li>
          <li>Duplicate accounts do not create additional entries.</li>
          <li>Wrestlers do not have to compete in the Tournament of Champions to be eligible.</li>
          <li>Recipients must be present at the Tournament of Champions on September 19, 2026, to receive an award.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "3. Random selection and attendance",
    content: (
      <p>
        Ten recipients will be selected randomly from eligible wrestler registrations. Recipients will be announced at
        the Tournament of Champions on September 19. A selected wrestler must be present when the awards are announced.
        If a selected wrestler is not present, that award is forfeited and another eligible wrestler may be selected at
        random.
      </p>
    ),
  },
  {
    title: "4. Awards",
    content: (
      <div className="space-y-3">
        <p>
          Ten recipients will each receive <strong>$100 in Wrestling Guild training credit</strong>, for a total of
          $1,000 awarded directly to wrestlers.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The credit will be applied immediately to each recipient&apos;s Wrestling Guild account.</li>
          <li>The credit may be used with any coach available through The Wrestling Guild at any location.</li>
          <li>The credit is not redeemable for cash.</li>
          <li>Training sessions remain subject to coach availability and The Wrestling Guild&apos;s booking policies.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "5. Odds and verification",
    content: (
      <p>
        The odds of receiving an award depend on the number of eligible wrestler accounts created during the promotion
        period and the number of eligible wrestlers present for the September 19 announcement. NC United and The
        Wrestling Guild may verify account eligibility, identity, duplicate registrations, and attendance before
        applying an award.
      </p>
    ),
  },
  {
    title: "6. Program administration",
    content: (
      <p>
        The program is presented by The Wrestling Guild in partnership with NC United Wrestling and the 2026 Tournament
        of Champions. Decisions concerning eligibility, random selection, attendance verification, and award fulfillment
        are final. Registration information is handled according to The Wrestling Guild&apos;s account and privacy policies.
      </p>
    ),
  },
] as const

export default function WrestlingGuildTrainingAwardsRulesPage() {
  return (
    <main className="min-h-screen bg-[#071426] text-white">
      <header className="border-b border-white/10 bg-gradient-to-br from-[#13294B] to-[#071426]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/tournament-of-champions#sponsors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Tournament of Champions
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#D3B574]">
            The Wrestling Guild × NC United
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">
            Wrestling Guild Training Awards
          </h1>
          <p className="mt-3 text-lg font-semibold text-[#D3B574]">Official Rules · August 9–September 15, 2026</p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg">
            Win up to $1,000 in training with current and former NCAA athletes. Creating a wrestler account is free,
            and no purchase is necessary. The full award structure is set out in the rules below.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="https://www.wrestlingguild.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#CC0000] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#a80000]"
            >
              Create a free Guild account <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/news/nc-united-wrestling-guild-premier-partner"
              className="inline-flex min-h-11 items-center rounded-sm border border-white/20 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white hover:border-[#D3B574]/60"
            >
              Read the announcement
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            ["10", "Randomly selected recipients"],
            ["$100", "Training credit per wrestler"],
            ["Sept. 19", "Must be present to receive"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-sm border border-[#D3B574]/25 bg-white/5 p-5">
              <p className="text-2xl font-black text-[#D3B574]">{value}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {RULE_SECTIONS.map((section) => (
            <section key={section.title} className="rounded-sm border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <h2 className="text-lg font-black uppercase tracking-wide text-white sm:text-xl">{section.title}</h2>
              <div className="mt-3 text-sm leading-7 text-white/70 sm:text-base">{section.content}</div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm leading-relaxed text-white/50">
          Questions about the program? Email{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="font-semibold text-[#D3B574] hover:underline">
            info@ncwrestlingunited.com
          </a>
          .
        </p>
      </div>
    </main>
  )
}
