import type { ReactNode } from "react"
import { HardLink } from "@/components/hard-link"
import { SpartanDonorMixGrounding } from "@/app/fundraising/playbook/_components/spartan-donor-mix-grounding"

function DH({ as: Tag = "h2", children }: { as?: "h1" | "h2" | "h3"; children: ReactNode }) {
  const base =
    Tag === "h1"
      ? "text-3xl font-black uppercase tracking-tight sm:text-[clamp(1.85rem,4vw,2.75rem)]"
      : Tag === "h2"
        ? "mt-14 scroll-mt-28 text-2xl font-black uppercase tracking-tight first:mt-0 sm:text-[1.65rem]"
        : "mt-8 text-lg font-bold uppercase tracking-wide text-[#C8A94A]"
  return <Tag className={`font-[family-name:var(--font-fundraising-display)] text-white ${base}`}>{children}</Tag>
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg font-medium leading-relaxed text-white/90">{children}</p>
}

function P({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-4 text-base leading-relaxed text-white/80 ${className}`}>{children}</p>
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

function MobileDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mt-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3 group-open:bg-black/30 sm:hidden">
      <summary className="cursor-pointer font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-[#C8A94A]">
        {title}
      </summary>
      <div className="mt-3 pb-1">{children}</div>
    </details>
  )
}

function DesktopBlock({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`hidden sm:block ${className}`}>{children}</div>
}

function OlFlawed() {
  const items = [
    "Standalone crowdfunding — fees, weak receipts, repeated asks get harder.",
    "Venmo / Cash App as primary — friction for matching, businesses, and serious donors.",
    "Car wash / bake sale only — enormous volunteer hours for thin yield vs structured nonprofit checkout.",
    "Passive posts alone — likes ≠ tuition; direct asks convert.",
    "Routing outside 501(c)(3) — corporate and foundation lanes collapse.",
    "One-off chaos each season — no list compounding, no CRM rhythm.",
    "Waiting until crisis — relationships built early convert better than panic.",
  ]
  return (
    <ol className="mt-4 list-decimal space-y-3 pl-5 text-white/80 marker:text-[#C8A94A]">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ol>
  )
}

export function PlaybookMembersContent() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#C8A94A]">
        The NC United fundraising playbook · Members
      </p>
      <DH as="h1">How the NC wrestling community raised $21,000 in 16 days</DH>
      <p className="mt-2 text-base text-white/65">And how your athlete can replicate the system — not the hustle-by-accident version.</p>

      <div className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-[#0B2545]/50 px-4 py-6 sm:grid-cols-4">
        {[
          ["$21,000+", "Raised"],
          ["220+", "Donations"],
          ["30+", "Athletes"],
          ["16", "Days"],
        ].map(([n, l]) => (
          <div key={l} className="text-center sm:text-left">
            <p className="font-[family-name:var(--font-fundraising-display)] text-2xl font-black tabular-nums text-[#C8A94A]">{n}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/60">{l}</p>
          </div>
        ))}
      </div>

      <DH as="h2">Read this first · Before you post that Venmo link</DH>
      <Lead>
        These approaches cost NC athletes real money every season — not because people don&apos;t care, but because the plumbing is wrong.
      </Lead>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-5">
          <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-wide text-white/55">
            Wrong way
          </p>
          <p className="mt-2 font-semibold text-white">Venmo / Cash App / typical crowdfunding</p>
          <p className="mt-3 text-sm text-white/75">10 donors × $200 = $2,000 raised</p>
          <Ul>
            <Li>No nonprofit receipt path through those rails</Li>
            <Li>Employer matching usually off the table</Li>
            <Li>Businesses &amp; foundations rarely structured</Li>
            <Li>Serious donors often hesitate</Li>
          </Ul>
          <p className="mt-4 text-sm font-semibold text-white/90">Illustration: ~$2,000 visible</p>
        </div>
        <div className="rounded-xl border border-[#C8A94A]/35 bg-[#C8A94A]/10 p-5">
          <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-black uppercase tracking-wide text-[#C8A94A]">
            Right way
          </p>
          <p className="mt-2 font-semibold text-white">NC United 501(c)(3) checkout</p>
          <p className="mt-3 text-sm text-white/85">10 donors × $200 = $2,000 raised</p>
          <Ul>
            <Li>Tax documentation when the donor qualifies</Li>
            <Li>Matching may apply (employer rules vary)</Li>
            <Li>Business &amp; foundation lanes open when structured</Li>
            <Li>Receipt + attribution built in</Li>
          </Ul>
          <p className="mt-4 text-sm text-white/85">
            Illustration only: the same ask can unlock meaningfully more via matching + institutional gifts — talk with your CPA about what
            applies.
          </p>
        </div>
      </div>

      <DH as="h3">Seven flawed models</DH>
      <OlFlawed />

      <DH as="h2">Fundraising is not begging · It is building investors</DH>
      <P>
        The athletes who raise the most are not always the ones with the biggest following. They make the clearest ask, tell the strongest
        story, and make it easy to say yes. Every NC wrestler has a story worth funding — the variable is whether they tell it with intention.
      </P>

      <DH as="h2">The NC United model</DH>
      <P className="text-white/70">Five pillars no single family or for-profit page easily replaces.</P>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          [
            "501(c)(3) structure",
            "Tax-advantaged giving for individuals and institutional donors when eligibility rules are met — without this, whole categories stay closed.",
          ],
          [
            "Central platform",
            "Checkout, attribution to athletes, receipts, and accountability in one nonprofit ledger.",
          ],
          ["Community network", "Collective investment in NC wrestling development instead of every family improvising alone."],
          ["Athlete accountability", "NC United provides rails; the outreach discipline is still yours."],
          ["Radical transparency", "Public progress, live boards where campaigns run, and documentation donors expect."],
        ].map(([t, b]) => (
          <div key={String(t)} className="rounded-xl border border-white/10 bg-[#0B2545]/40 p-5">
            <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-[#C8A94A]">{t}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{b}</p>
          </div>
        ))}
      </div>

      <DH as="h2">Who can give — and how much</DH>

      <SpartanDonorMixGrounding />

      <MobileDetails title="Individual donors ($25–$500)">
        <P>
          Spartan Fayetteville&apos;s volume piled up here first — family-scale gifts stacking fast. Parents, relatives, coaches, neighbors:
          personal text/call/in-person beats bulk email alone.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Individual donors ($25–$500)</DH>
        <P>
          Spartan Fayetteville&apos;s volume piled up here first — family-scale gifts stacking fast. Parents, relatives, coaches, neighbors:
          personal text/call/in-person beats bulk email alone.
        </P>
      </DesktopBlock>

      <MobileDetails title="Local business ($100–$1,000)">
        <P>
          Named NC trades ran gifts through the same nonprofit Stripe rails as grandparents — Caffeine Fueled Lawn Service, Carolina Heating &amp;
          Air, North State Sport &amp; Spine-class supporters.
        </P>
        <P className="text-sm text-white/65">
          Tax outcomes depend on entity type — coordinate with a tax advisor for business gifts.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Local business ($100–$1,000)</DH>
        <P>
          Named NC trades ran gifts through the same nonprofit Stripe rails as grandparents — Caffeine Fueled Lawn Service, Carolina Heating &amp;
          Air, North State Sport &amp; Spine-class supporters.
        </P>
        <P className="text-sm text-white/65">
          Tax outcomes depend on entity type — coordinate with a tax advisor for business gifts.
        </P>
      </DesktopBlock>

      <MobileDetails title="Corporate ($1,000–$25,000+)">
        <P>
          Institutional checks showed up once the 501(c)(3) path was obvious — Fayetteville reinforced why corporations rarely fund individuals
          directly but fund nonprofits.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Corporate ($1,000–$25,000+)</DH>
        <P>
          Institutional checks showed up once the 501(c)(3) path was obvious — Fayetteville reinforced why corporations rarely fund individuals
          directly but fund nonprofits.
        </P>
      </DesktopBlock>

      <MobileDetails title="Foundations & grants ($500–$10,000+)">
        <P>
          Foundation dollars cleared because NC United was the recipient — Adam Mills Foundation is the headline example from that Spartan window.
          Align future asks with youth access and education outcomes.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Foundations &amp; grants ($500–$10,000+)</DH>
        <P>
          Foundation dollars cleared because NC United was the recipient — Adam Mills Foundation is the headline example from that Spartan window.
          Align future asks with youth access and education outcomes.
        </P>
      </DesktopBlock>

      <DH as="h3">Matching gifts — ask every time</DH>
      <P>
        Many employers match charitable donations when programs qualify — typically tied to 501(c)(3) gifts. After someone gives, ask whether
        their employer matches. Donors search for NC United Wrestling or EIN <span className="tabular-nums">99-3757238</span>. Quick nonprofit
        confirmation matters — slow replies lose matches.
      </P>
      <P>
        <Strong>Copy-ready ask:</Strong> &quot;Does your employer match charitable gifts? NC United is a registered 501(c)(3) (EIN 99-3757238)
        — your gift may qualify.&quot;{" "}
        <a
          href="https://doublethedonation.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          Double the Donation
        </a>{" "}
        and similar tools help donors check eligibility.
      </P>

      <DH as="h2">The 501(c)(3) advantage</DH>
      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm text-white/85">
          <thead>
            <tr className="border-b border-white/10 bg-[#0B2545]/80">
              <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-wide">
                Scenario
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-wide">
                Informal / non-501(c)(3)
              </th>
              <th className="px-3 py-2 font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-wide">
                NC United
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {[
              ["Friend gives $100", "Usually no deduction path", "Deduction when eligible"],
              ["Local business $500", "Usually unstructured", "Structured nonprofit gift"],
              ["Corporation $5,000", "Rare without 501(c)(3)", "Eligible path when structured"],
              ["Foundation grant", "Not eligible", "Eligible when aligned"],
              ["Employer matching", "Usually ineligible", "Often eligible when programs allow"],
              ["Receipt + attribution", "Fragmented", "Checkout + ledger"],
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

      <DH as="h2">The fundraising toolkit</DH>
      <Ul>
        <Li>
          <Strong>Your story</Strong> — three tight paragraphs: who you are, what you&apos;re funding (specific dollars), why it matters.
        </Li>
        <Li>
          <Strong>A numeric ask</Strong> — &quot;20 people × $100&quot; beats &quot;anything helps&quot; alone.
        </Li>
        <Li>
          <Strong>NC United checkout link</Strong> — mobile receipt + athlete credit + hub transparency.
        </Li>
        <Li>
          <Strong>A written outreach list</Strong> — most athletes find dozens of real contacts when they commit it to paper.
        </Li>
      </Ul>
      <P>
        Tier examples: <Strong>$25</Strong> practice · <Strong>$50</Strong> entry fee · <Strong>$100</Strong> private ·{" "}
        <Strong>$500</Strong> travel · <Strong>$1,000</Strong> summer training block.
      </P>

      <DH as="h2">The outreach sequence</DH>
      <P>
        <Strong>Week 1 — direct asks.</Strong> Top ~20 likely donors by text, call, or in-person — not mass blast alone.
      </P>
      <blockquote className="mt-4 border-l-4 border-[#C8A94A]/80 bg-white/[0.04] px-4 py-3 text-sm italic leading-relaxed text-white/85">
        &quot;Hey [name] — I&apos;m raising for wrestling training and competitions this season toward [specific goal]. I&apos;m asking people who
        know my work to consider [amount]. It runs through NC United Wrestling — 501(c)(3), tax-deductible when you qualify. Here&apos;s the
        link. Would you help?&quot;
      </blockquote>
      <P>
        <Strong>Week 2 — social proof.</Strong> Post with a mat photo, specific goal, dollar ask, link, deadline.
      </P>
      <P>
        <Strong>Week 3 — follow up.</Strong> Polite reminders convert people who meant to donate.
      </P>
      <P>
        <Strong>Ongoing — business corridor.</Strong> Parallel track with intros and one-page proposals for local businesses.
      </P>

      <DH as="h2">Campaign execution models</DH>
      <P className="text-white/65">
        Tactical patterns teams reuse — not tied to any single vendor event. Adapt to your roster and coaches.
      </P>

      <MobileDetails title="Phonathon (team room)">
        <P>
          Team block on the calendar, lists prepared, coach sets a visible goal, simultaneous texts/calls, leaderboard visible for momentum. Peer
          energy drives completion rates.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Phonathon</DH>
        <P>
          Team block on the calendar, lists prepared, coach sets a visible goal, simultaneous texts/calls, leaderboard visible for momentum. Peer
          energy drives completion rates.
        </P>
      </DesktopBlock>

      <MobileDetails title="Business blitz">
        <P>
          Map businesses tied to families, pair athletes, in-person drop-offs with one-pagers, donations routed through NC United checkout for clean
          receipts.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Business blitz</DH>
        <P>
          Map businesses tied to families, pair athletes, in-person drop-offs with one-pagers, donations routed through NC United checkout for clean
          receipts.
        </P>
      </DesktopBlock>

      <MobileDetails title="Team challenge (leaderboard)">
        <P>
          Short window, public progress, blend team goal with individual recognition — wrestlers respond to visible competition when ethics and
          sportsmanship stay centered.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Team challenge</DH>
        <P>
          Short window, public progress, blend team goal with individual recognition — wrestlers respond to visible competition when ethics and
          sportsmanship stay centered.
        </P>
      </DesktopBlock>

      <MobileDetails title="Parent network activation">
        <P>
          Activate professional networks: each parent lists a handful of employer-match-friendly prospects; introductions ride parent credibility.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Parent network activation</DH>
        <P>
          Activate professional networks: each parent lists a handful of employer-match-friendly prospects; introductions ride parent credibility.
        </P>
      </DesktopBlock>

      <MobileDetails title="Event-anchored campaign">
        <P>
          Anchor asks to a trip, nationals block, or summer training arc — specificity beats vague &quot;help our club&quot; every time.
        </P>
      </MobileDetails>
      <DesktopBlock>
        <DH as="h3">Event-anchored campaign</DH>
        <P>
          Anchor asks to a trip, nationals block, or summer training arc — specificity beats vague &quot;help our club&quot; every time.
        </P>
      </DesktopBlock>

      <DH as="h2">The proof — it worked</DH>
      <P>
        A recent NC United timed fundraiser crossed roughly <Strong>$20k+ raised</Strong>, <Strong>200+ donations</Strong>, dozens of athletes
        credited, in about two weeks — because donors could say yes through a nonprofit checkout with attribution.
      </P>
      <div className="mt-6 grid gap-3 rounded-xl border border-[#C8A94A]/25 bg-[#C8A94A]/10 px-4 py-6 sm:grid-cols-3">
        {[
          ["$20k+", "Campaign-scale raised"],
          ["200+", "Paid gifts"],
          ["29+", "Athletes with designated credits"],
        ].map(([n, l]) => (
          <div key={l} className="text-center">
            <p className="font-[family-name:var(--font-fundraising-display)] text-xl font-black text-[#C8A94A]">{n}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/70">{l}</p>
          </div>
        ))}
      </div>
      <P className="text-sm text-white/60">Figures are rounded snapshots from a past campaign window; your results depend on execution.</P>

      <DH as="h2">Start now</DH>
      <P>
        You are not only a wrestler — you are a story worth investing in. The rails exist; the community is showing up. What&apos;s left is a
        clear ask and consistent follow-through.
      </P>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <HardLink
          href="/fundraising/athletes"
          className="inline-flex min-h-[52px] items-center justify-center rounded-sm bg-[#CC0000] px-8 font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[#a80000]"
        >
          Set up athlete fundraising →
        </HardLink>
        <HardLink
          href="/fundraising"
          className="inline-flex min-h-[52px] items-center justify-center rounded-sm border border-white/25 px-8 font-[family-name:var(--font-fundraising-display)] text-sm font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] hover:bg-white/5"
        >
          Fundraising hub →
        </HardLink>
        <HardLink
          href="/fundraising/playbook/guide"
          className="inline-flex min-h-[52px] items-center justify-center rounded-sm border border-white/15 px-8 text-sm font-semibold text-white/80 underline-offset-4 hover:text-[#C8A94A] hover:underline"
        >
          Public guide (shareable link)
        </HardLink>
      </div>

      <p className="mt-14 text-xs leading-relaxed text-white/45">
        NC United Wrestling is a registered 501(c)(3). EIN <span className="tabular-nums">99-3757238</span>. Donations are tax-deductible to the
        extent allowed by law. NCUnitedWrestling.com · info@ncwrestlingunited.com · #NCUnited #StrengthInUnity #NCWrestling
      </p>
    </article>
  )
}
