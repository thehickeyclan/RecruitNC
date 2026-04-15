import Image from "next/image"

/** Inline figures only. Hero for home + /news list + article header: `lib/news.ts` → `real-cost-elite-wrestling-nc-hero.png`. */
const IMG = {
  annual: "/images/real-cost-nc-annual-cost-infographic.png",
  scholarship: "/images/real-cost-nc-scholarship-reality.png",
  five29: "/images/real-cost-nc-529-plan-smarter.png",
  nonprofit: "/images/real-cost-nc-nonprofit-build.png",
  spartan: "/images/real-cost-nc-spartan-campaign.png",
  quotes: "/images/real-cost-nc-quote-tiles.png",
} as const

/**
 * The Real Cost of Elite Wrestling in NC — analysis + 529 + 501(c)(3) + Spartan.
 * Financial illustrations labeled hypothetical where appropriate.
 */
export function RealCostEliteWrestlingNcSmarterBuildContent() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200 [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-2">
      <p className="text-slate-600 font-medium not-italic">
        By <strong>Matt Hickey</strong>, Founder — NC United Wrestling
      </p>

      <h2>The number almost nobody puts on paper</h2>
      <p>
        If you are raising a serious high school wrestler in North Carolina, you are likely spending somewhere in the range of{" "}
        <strong>$15,000 to $25,000 per year</strong> on development. Across four years of high school, that is on the order of{" "}
        <strong>$60,000 to $100,000</strong> — and many families do not see it coming because it shows up a few hundred dollars at a time.
      </p>
      <p>
        This piece is about that range: where the money goes, why it exists, and how families can plan so wrestling opens doors without
        quietly draining the rest of the plan.
      </p>
      <p className="text-sm text-slate-500">
        The line-item model below is a <strong>representative budget</strong> compiled from detailed spending conversations with competitive
        NC United families — not a universal guarantee for every household, but a useful picture of what &ldquo;elite path&rdquo; often costs
        when travel and training are real.
      </p>

      <h2>What it costs to run an elite path (representative model)</h2>

      <h3>Training</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Club dues</td>
              <td>$1,800/year</td>
            </tr>
            <tr>
              <td>NC United membership</td>
              <td>$600/year</td>
            </tr>
            <tr>
              <td>Private lessons (8/month × $75)</td>
              <td>$4,800/year</td>
            </tr>
            <tr>
              <td>
                <strong>Training subtotal</strong>
              </td>
              <td>
                <strong>$7,200/year</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Major competition travel</h3>
      <p className="text-sm text-slate-600">
        These are the events that move recruiting conversations. Skip them and visibility drops — not a moral judgment, a practical one.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Typical cost range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>NHSCA Nationals (Virginia Beach)</td>
              <td>$1,100–$1,300</td>
            </tr>
            <tr>
              <td>NHSCA Duals (Virginia Beach)</td>
              <td>$1,100–$1,300</td>
            </tr>
            <tr>
              <td>Journeymen (travel)</td>
              <td>$1,200–$1,800</td>
            </tr>
            <tr>
              <td>Super 32 (Greensboro, NC)</td>
              <td>$200–$400</td>
            </tr>
            <tr>
              <td>NCHSAA state tournament (Greensboro, NC)</td>
              <td>$150–$300</td>
            </tr>
            <tr>
              <td>Road to Fargo (travel, extended stay, camp)</td>
              <td>$3,000–$5,000</td>
            </tr>
            <tr>
              <td>
                <strong>Subtotal</strong>
              </td>
              <td>
                <strong>$6,750–$10,100</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Additional events &amp; extras</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Two additional tournaments</td>
              <td>$800–$1,600</td>
            </tr>
            <tr>
              <td>College opens</td>
              <td>~$300</td>
            </tr>
            <tr>
              <td>High school season / misc events</td>
              <td>~$500</td>
            </tr>
            <tr>
              <td>Entry fees (example: $50 × 8 weekends)</td>
              <td>~$400</td>
            </tr>
            <tr>
              <td>Summer camps + clinics</td>
              <td>~$1,000</td>
            </tr>
            <tr>
              <td>Gear and apparel (annual)</td>
              <td>~$500</td>
            </tr>
            <tr>
              <td>FloWrestling subscription</td>
              <td>~$150</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Annual totals (model)</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Annual range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base elite path (without Fargo)</td>
              <td>$15,400 – $20,500</td>
            </tr>
            <tr>
              <td>With Fargo on the calendar</td>
              <td>$18,400 – $25,500</td>
            </tr>
          </tbody>
        </table>
      </div>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <Image
          src={IMG.annual}
          alt="Infographic: annual cost to develop an elite NC wrestler — training, travel, events, and gear as a bar chart with yearly total ranges"
          width={1600}
          height={900}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Representative model (same numbers as the tables above). Individual families vary.
        </figcaption>
      </figure>

      <p>
        Over four years of high school, that stacks to roughly <strong>$60,000–$100,000</strong> before you count middle school or anything
        prior to ninth grade. You can offset a little by stacking vacation with a tournament trip or comparing travel meals to normal grocery
        spend — usually hundreds a year, not thousands.
      </p>

      <h2>The tax reality (illustrative)</h2>
      <p>
        Taxes change the feel of the number. In many middle- and upper-middle-income households, needing roughly <strong>$80,000 after tax</strong>{" "}
        can mean earning a materially larger gross figure — the exact ratio depends on your federal bracket, state taxes, deductions, and
        year. The point is simple: the &ldquo;sticker price&rdquo; of wrestling is not the same as the pre-tax income required to fund it.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <Image
          src={IMG.quotes}
          alt="Pull quotes: long-term value of wrestling investment, tax reality of pre-tax dollars, and sharing the load through the tax code and community"
          width={1600}
          height={600}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Themes from families and advisors — including the gap between after-tax spend and pre-tax earnings.
        </figcaption>
      </figure>

      <h2>What families are buying — and what a scholarship actually covers</h2>
      <p>
        The dream is often a Division I scholarship. Wrestling is an <strong>equivalency</strong> sport: full rides are rare; partial awards are
        normal. A common planning range cited in recruiting conversations is on the order of <strong>~40% of a full scholarship</strong> per
        athlete — a useful benchmark, not a rule for any single program.
      </p>
      <p className="text-sm text-slate-500">
        Published cost of attendance varies by school and year; treat the table below as <strong>approximate</strong> totals (tuition, fees, room,
        board, and typical expenses) useful for orientation — not a quote for financial aid.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>School (examples, in-state orientation)</th>
              <th>Approx. annual COA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>UNC Chapel Hill</td>
              <td>~$27,000–$32,000</td>
            </tr>
            <tr>
              <td>NC State</td>
              <td>~$26,000–$31,000</td>
            </tr>
            <tr>
              <td>App State</td>
              <td>~$23,000–$28,000</td>
            </tr>
            <tr>
              <td>Gardner-Webb</td>
              <td>~$45,000–$55,000</td>
            </tr>
            <tr>
              <td>Davidson</td>
              <td>~$75,000–$85,000</td>
            </tr>
            <tr>
              <td>Campbell</td>
              <td>~$40,000–$50,000</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        If a family invests heavily in development and still faces a large net college bill, that is not a failure — it is the math of partial
        awards plus real COA. Academic merit and need-based aid (when you qualify) can change the picture; those dollars often exist with or
        without wrestling, which is why honest net-value conversations matter.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <Image
          src={IMG.scholarship}
          alt="Chart: development cost vs average D1 wrestling scholarship value vs out-of-pocket college cost, 9th grade through graduation — illustrative four-year totals"
          width={1600}
          height={900}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Illustrative four-year totals — not a guarantee for any one school or athlete.
        </figcaption>
      </figure>

      <h2>The 529 illustration families should see</h2>
      <p>
        The families who feel the least trapped are often the ones who build <strong>college savings alongside wrestling</strong>, not instead of
        it — usually through a 529 plan: tax-advantaged growth and tax-free withdrawals for qualified education expenses when used correctly.
      </p>
      <p className="text-sm text-slate-500">
        The table below is a <strong>hypothetical illustration</strong> — not a prediction, projection, or offer. Real returns vary; plans have
        fees; balances fluctuate. Talk to a licensed professional about your situation.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table>
          <thead>
            <tr>
              <th>Assumption</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monthly contribution</td>
              <td>$370/month</td>
            </tr>
            <tr>
              <td>Duration</td>
              <td>18 years</td>
            </tr>
            <tr>
              <td>Total contributed</td>
              <td>~$79,920</td>
            </tr>
            <tr>
              <td>Illustrative balance at 18 (10% average annual return)</td>
              <td>$228,000+</td>
            </tr>
          </tbody>
        </table>
      </div>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-amber-50/40 shadow-sm">
        <Image
          src={IMG.five29}
          alt="Chart: hypothetical growth of $370 per month from birth to age 18 at 10% average annual return, with contribution vs balance lines"
          width={1600}
          height={900}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Hypothetical illustration — not a projection or guarantee. Returns, fees, and rules vary.
        </figcaption>
      </figure>

      <p>
        The point is structural: when college is funded in parallel, a wrestling scholarship becomes <strong>upside</strong>, not oxygen. Many
        families also benefit from rules allowing unused 529 funds to roll into a Roth IRA within limits (SECURE Act provisions) — another reason
        to review current law with a tax advisor.
      </p>

      <h2>What a 501(c)(3) changes</h2>
      <p>
        The problem is not the sport. The problem is that North Carolina has rarely had a single, durable nonprofit home for{" "}
        <strong>community investment in athlete development</strong>. Without that hub, families carry the full weight alone — and too many
        talented kids exit the path early for the wrong reason: cash flow at the wrong moment.
      </p>
      <p>
        <strong>NC United Wrestling</strong> is a registered 501(c)(3). Donations are generally tax-deductible for donors who itemize (subject to
        IRS rules), which lets the community share the load in a structured way — and lets athletes practice the skill of building support around
        their goals.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <Image
          src={IMG.nonprofit}
          alt="NC United Wrestling: Build Athletes, Build Futures, Build NC Wrestling — registered 501(c)(3) nonprofit messaging"
          width={1600}
          height={900}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          North Carolina&apos;s wrestling development nonprofit — community investment with accountability.
        </figcaption>
      </figure>

      <h2>Spartan Race × NC United (April 2026)</h2>
      <p>
        In <strong>April 2026</strong>, NC United partnered with <strong>Spartan Race</strong> CEO Joe De Sena on a fundraising campaign that puts
        dollars back into training and competition for North Carolina wrestlers.
      </p>
      <ul>
        <li>
          <strong>Run</strong> — register for a Spartan event with a discounted entry code tied to the campaign
        </li>
        <li>
          <strong>Sponsor</strong> — donate to sponsor North Carolina at Spartan
        </li>
        <li>
          <strong>Give</strong> — contribute directly to NC wrestling development through NC United
        </li>
      </ul>
      <p>
        Donors can often <strong>designate support to a specific athlete</strong> or to the <strong>statewide athlete fund</strong>, depending on
        campaign setup. See the live campaign page for current options.
      </p>

      <figure className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <Image
          src={IMG.spartan}
          alt="Spartan Race campaign: Run, Sponsor, Give — designate an athlete or the statewide fund; example donor math"
          width={1600}
          height={900}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
        <figcaption className="border-t border-slate-200 bg-white px-3 py-2.5 text-center text-sm text-slate-600">
          Three ways to participate; dollars can support a named athlete or the statewide fund.
        </figcaption>
      </figure>

      <p>
        <a
          href="/spartan"
          className="font-semibold text-[#C20017] underline decoration-[#C20017]/40 underline-offset-2 hover:decoration-[#C20017]"
        >
          NC United × Spartan — donate or register
        </a>
      </p>

      <h3>Why the charitable deduction matters (example)</h3>
      <p>
        If an uncle donates <strong>$500</strong> to NC United in a wrestler&apos;s name, he may deduct that contribution if he itemizes and the
        gift qualifies under current IRS rules. In a <strong>22% marginal bracket</strong>, a $500 deduction reduces tax by about <strong>$110</strong>{" "}
        — so the net cash cost of giving can be lower than writing a check to a non-charitable fee with no deduction. (Everyone&apos;s taxes differ;
        this is illustration only.)
      </p>

      <h3>Small network, real dollars</h3>
      <p>
        The Spartan Super 10K donation level has been used at <strong>$155</strong> as a reference point. Ten people in an athlete&apos;s circle
        (family, coaches, neighbors) each giving at that level is <strong>$1,550</strong> toward camps, travel, and competition — raised through
        intentional outreach, not luck.
      </p>

      <h2>The ecosystem North Carolina has been missing</h2>
      <ul>
        <li>Developmental pathways from middle school through high school with funding behind them</li>
        <li>Mentorship chains: college athletes mentoring high schoolers, high schoolers mentoring youth</li>
        <li>Internships and work pathways tied to wrestling discipline</li>
        <li>Corporate and foundation partners giving through a recognized charitable entity</li>
        <li>Statewide coordination so clubs complement instead of accidentally working at cross purposes</li>
      </ul>

      <h2>Closing</h2>
      <p>
        North Carolina wrestling families are not &ldquo;overspending on a hobby.&rdquo; They are funding a sport that forges unusual humans. The
        opportunity is to <strong>plan the money like you plan the training</strong>: start education savings early, use the tax code where it
        applies, and build community support through a real nonprofit so the load is shared.
      </p>
      <p>
        NC United exists to organize that second half — alongside every club and coach already doing the work on the mat.
      </p>

      <hr />

      <footer className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="my-0 font-medium text-slate-700">NC United Wrestling</p>
        <p className="my-2">
          Registered 501(c)(3) nonprofit. EIN: <strong>99-3757238</strong>. Consult a tax or financial professional before making planning
          decisions. Nothing in this article is tax, legal, or investment advice.
        </p>
        <p className="my-0">
          Learn more:{" "}
          <a
            href="https://ncunitedwrestling.com"
            className="font-medium text-[#003366] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            NCUnitedWrestling.com
          </a>
        </p>
      </footer>
    </article>
  )
}
