import type { ReactNode } from "react"
import { HardLink } from "@/components/hard-link"

function DisplayHeading({ as: Tag = "h2", className = "", children }: { as?: "h1" | "h2" | "h3"; className?: string; children: ReactNode }) {
  const base =
    Tag === "h1"
      ? "text-3xl font-black uppercase tracking-tight sm:text-4xl"
      : Tag === "h2"
        ? "mt-14 scroll-mt-24 text-2xl font-black uppercase tracking-tight first:mt-0 sm:text-[1.65rem]"
        : "mt-8 text-lg font-bold uppercase tracking-wide text-[#C8A94A]"
  return <Tag className={`font-[family-name:var(--font-fundraising-display)] text-white ${base} ${className}`}>{children}</Tag>
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg font-medium leading-relaxed text-white/90">{children}</p>
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-base leading-relaxed text-white/80">{children}</p>
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5 text-white/80 marker:text-[#C8A94A]">{children}</ul>
}

function Li({ children }: { children: ReactNode }) {
  return <li className="leading-relaxed">{children}</li>
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white/95">{children}</strong>
}

export function FundraisingPlaybookGuideContent() {
  return (
    <>
      <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
        NC United Wrestling · NCUnitedWrestling.com
      </p>
      <DisplayHeading as="h1">The NC United Fundraising Playbook</DisplayHeading>
      <p className="mt-2 text-base text-white/65">How to Fund Your Athlete&apos;s Development — And Why the System Behind It Changes Everything</p>

      <Lead>
        Most athletes are leaving thousands of dollars on the table — not because their community doesn&apos;t want to help, but because nobody
        taught them how to build a real fundraising system around their development.
      </Lead>
      <P>
        <Strong>This is not theory. This is already working.</Strong> The NC United × Spartan Race blew past a{" "}
        <Strong>$10k</Strong> goal in under two weeks — <Strong>$20,000+</Strong> raised, <Strong>204</Strong> donations,{" "}
        <Strong>37</Strong> runners, <Strong>29</Strong> athletes with designated gifts — with zero advance prep (
        <span className="font-semibold text-white/90">see breakdown below</span>).
      </P>

      <DisplayHeading as="h2">What Doesn&apos;t Work — Read This Before You Post a Venmo Link</DisplayHeading>
      <Ul>
        <Li>
          <Strong>Standalone crowdfunding (e.g. GoFundMe)</Strong> — usually no donor deduction, weak institutional credibility, hard to
          repeat.
        </Li>
        <Li>
          <Strong>Car wash / bake sale as the only plan</Strong> — massive time for modest return vs. a structured 501(c)(3) campaign.
        </Li>
        <Li>
          <Strong>Passive social-only asks</Strong> — likes don&apos;t pay fees; direct asks convert.
        </Li>
        <Li>
          <Strong>Individual requests on social for Venmo, Cash App, etc.</Strong> — immediate loss of credibility with donors who expect a
          nonprofit structure, a receipt, and accountability — not a personal handle.
        </Li>
        <Li>
          <Strong>Non-501(c)(3) routing</Strong> — caps corporate, foundation, and matching eligibility.
        </Li>
        <Li>
          <Strong>Personal Venmo/Cash App as the main vehicle</Strong> — no receipt, no transparency, corporate ineligible, serious donor friction.
        </Li>
        <Li>
          <Strong>One-off campaigns with no system</Strong> — you restart from zero every season instead of compounding trust and donors.
        </Li>
        <Li>
          <Strong>Waiting until you&apos;re underwater financially</Strong> — start early; relationships beat panic.
        </Li>
      </Ul>

      <DisplayHeading as="h2">The Mindset Shift First</DisplayHeading>
      <P>
        Fundraising for your development is not begging. It is building a community of investors who believe in what you are doing. The
        athletes who raise the most make the clearest ask, tell the most compelling story, and make it easy for people to say yes.
      </P>

      <DisplayHeading as="h2">The NC United Model</DisplayHeading>
      <P>NC United combines four things that no individual family, club, or for-profit can replicate alone:</P>
      <Ul>
        <Li>
          <Strong>501(c)(3) structure</Strong> — tax-deductible giving for individuals, businesses, corporations, and foundations.
        </Li>
        <Li>
          <Strong>Central platform</Strong> — tracks donations, allocates funds to athletes, generates tax receipts, and maintains IRS-ready
          accountability.
        </Li>
        <Li>
          <Strong>Community network</Strong> — collective investment in NC wrestling development.
        </Li>
        <Li>
          <Strong>Athlete accountability</Strong> — each athlete drives their own support; the system provides the tools.
        </Li>
      </Ul>
      <P>
        <Strong>Radical transparency</Strong> — donations are public, dollars are tracked in real time, live leaderboards show progress, and
        IRS-compliant receipts are generated and emailed automatically. Transparency builds social proof and meets what the IRS expects.
      </P>

      <DisplayHeading as="h2">Why This Matters for North Carolina Wrestling</DisplayHeading>
      <P>
        Development has been limited by access — not talent. The NC United model expands who can give through a 501(c)(3) in an athlete&apos;s
        name: tax-deductible, tracked, and accountable. <Strong>Access expands. Opportunity scales.</Strong>
      </P>

      <DisplayHeading as="h2">Who Can Give — And How Much</DisplayHeading>

      <DisplayHeading as="h3">Individual Donors — Friends and Family</DisplayHeading>
      <P>
        <Strong>Who:</Strong> Parents, grandparents, relatives, coaches, teachers, neighbors. <Strong>Typical gift:</Strong> $25–$500.{" "}
        <Strong>Best approach:</Strong> direct personal ask — text, call, or in-person. Never mass email as your only strategy.
      </P>

      <DisplayHeading as="h3">Community and Local Business Donors</DisplayHeading>
      <P>
        <Strong>Who:</Strong> Restaurants, contractors, agents, gyms, retailers, professional services. <Strong>Typical gift:</Strong>{" "}
        $100–$1,000.
      </P>
      <P>
        For business owners, charitable gifts to a 501(c)(3) carry real tax advantages (C-Corps, pass-through entities, sole props). Beyond
        tax: visibility, employee engagement, network access, and brand alignment with youth development.
      </P>
      <P>
        <Strong>Best approach:</Strong> brief visit or one-page proposal — clear ask, NC United EIN <span className="tabular-nums">99-3757238</span>
        , and an easy donation link.
      </P>

      <DisplayHeading as="h3">Corporate Donors</DisplayHeading>
      <P>
        <Strong>Typical gift:</Strong> $1,000–$25,000+. Corporations usually cannot donate to individuals in a tax-beneficial way — they give
        through 501(c)(3) organizations. That is why NC United&apos;s structure unlocks corporate giving.
      </P>

      <DisplayHeading as="h3">Foundations and Grants</DisplayHeading>
      <P>
        Foundations give to 501(c)(3) organizations. <Strong>Best approach:</Strong> research local foundations, annual cycles, and align
        programs with mission (youth development, access, education).
      </P>

      <DisplayHeading as="h3">Matching Gift Programs</DisplayHeading>
      <P>
        Many employers match employee donations. Matching typically <Strong>only applies to 501(c)(3) gifts</Strong> — another reason the NC
        United structure matters.
      </P>
      <Ul>
        <Li>After someone donates, follow up: ask if their employer matches charitable gifts.</Li>
        <Li>
          Donors search for &quot;NC United Wrestling&quot; or EIN <span className="tabular-nums">99-3757238</span> in the employer portal.
        </Li>
        <Li>NC United should verify quickly when employers request confirmation — slow responses kill matches.</Li>
        <Li>
          Tools like{" "}
          <a
            href="https://doublethedonation.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            Double the Donation
          </a>{" "}
          help donors check eligibility.
        </Li>
      </Ul>
      <P>
        <Strong>The ask (text template):</Strong> Thank the donor, then ask whether their employer offers matching — NC United is a registered
        501(c)(3) (EIN: 99-3757238) and the gift may qualify to double at no extra cost.
      </P>

      <DisplayHeading as="h2">The 501(c)(3) Advantage — At a Glance</DisplayHeading>
      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm text-white/85">
          <thead>
            <tr className="border-b border-white/10 bg-[#0B2545]/80">
              <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-wide">
                Giving scenario
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-wide">
                Individual / for-profit
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-wide">
                NC United 501(c)(3)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {[
              ["Friend gives $100", "Not tax-deductible", "Tax-deductible"],
              ["Local business gives $500", "Not tax-deductible", "Tax-deductible"],
              ["Corporation gives $5,000", "No corporate tax vehicle", "Tax-deductible path"],
              ["Foundation grant", "Not eligible", "Eligible"],
              ["Employer matching gift", "Not eligible", "Eligible"],
              ["Receipt for tax records", "No formal receipt", "Automatic receipt"],
            ].map(([a, b, c]) => (
              <tr key={String(a)} className="bg-black/10">
                <td className="px-3 py-2 align-top">{a}</td>
                <td className="px-3 py-2 align-top text-white/65">{b}</td>
                <td className="px-3 py-2 align-top text-[#C8A94A]/95">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DisplayHeading as="h2">The Fundraising Toolkit</DisplayHeading>
      <Ul>
        <Li>
          <Strong>Your story, written down</Strong> — who you are, what you&apos;re raising for (specific), why it matters.
        </Li>
        <Li>
          <Strong>A simple ask amount</Strong> — e.g. twenty people at $100 beats &quot;any amount helps&quot; alone.
        </Li>
        <Li>
          <Strong>A donation link through NC United</Strong> — mobile-friendly checkout, tax receipt, credit to the right athlete.
        </Li>
        <Li>
          <Strong>A personal outreach list</Strong> — most athletes find 50–100 plausible contacts when they actually write it out.
        </Li>
      </Ul>
      <P>
        Suggested tiers: <Strong>$25</Strong> practice fees · <Strong>$50</Strong> tournament entry · <Strong>$100</Strong> private lesson ·{" "}
        <Strong>$155</Strong> race-entry–style gift tier · <Strong>$500</Strong> travel weekend · <Strong>$1,000</Strong> elite summer camp.
      </P>

      <DisplayHeading as="h2">The Outreach Sequence</DisplayHeading>
      <P>
        <Strong>Week 1:</Strong> top 20 direct asks (text, call, or in-person). Do not rely on mass email or one passive social post as your
        whole plan.
      </P>
      <blockquote className="mt-4 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Hey [name] — I&apos;m raising money for my wrestling training and competition this season. I&apos;m trying to get to [specific
        goal] and I&apos;m asking people who have supported me to consider giving [specific amount]. All donations go through NC United Wrestling
        — it&apos;s a nonprofit so it&apos;s tax-deductible. Here&apos;s the link. Would you be willing to help?&quot;
      </blockquote>
      <P>
        <Strong>Week 2:</Strong> social posts with a real photo, specific goal and progress, dollar ask, link, and deadline.{" "}
        <Strong>Week 3:</Strong> follow up — polite follow-through converts people who meant to give. <Strong>Ongoing:</Strong> business and
        corporate asks in parallel (often longer sales cycles).
      </P>

      <DisplayHeading as="h2">Case study: The NC United × Spartan Race — The Model in Action</DisplayHeading>
      <P>
        In under two weeks with zero advance prep: <Strong>$20,000+</Strong> raised against a $10k goal, <Strong>204 donations</Strong>,{" "}
        <Strong>37</Strong> race participants, <Strong>29</Strong> athletes with designated gifts — from individuals, businesses, and
        foundations — because the system made it easy to say yes.
      </P>
      <P className="mt-3 text-sm text-white/60">
        That campaign window has ended. Ongoing tax-deductible gifts still run through NC United&apos;s nonprofit checkout — athlete credit
        pages and the Make a gift hub below.
      </P>
      <div className="mt-4">
        <HardLink
          href="/fundraising/give"
          className="inline-flex min-h-10 items-center rounded-sm bg-[#CC0000] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-[#a80000]"
        >
          Make a gift — training fund or athlete
        </HardLink>
      </div>

      <DisplayHeading as="h2">Closing</DisplayHeading>
      <P>
        You are not just a wrestler — you are a story and a cause worth investing in. The athletes who raise the most make the clearest ask,
        tell their story with conviction, build real relationships, and follow up.
      </P>
      <P>
        <Strong>NC United Wrestling</Strong> is a registered 501(c)(3). EIN: <span className="tabular-nums">99-3757238</span>. Donations are
        tax-deductible to the extent allowed by law.
      </P>
      <P className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <HardLink
          href="/fundraising/give"
          className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#CC0000] px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#a80000]"
        >
          Make a gift — NC United checkout
        </HardLink>
        <HardLink
          href="/fundraising"
          className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/25 px-6 text-sm font-semibold text-[#C8A94A] hover:bg-white/5"
        >
          Fundraising hub
        </HardLink>
      </P>
      <p className="mt-10 text-xs text-white/45">
        NCUnitedWrestling.com · #NCUnited #StrengthInUnity #NCWrestling
      </p>
    </>
  )
}
