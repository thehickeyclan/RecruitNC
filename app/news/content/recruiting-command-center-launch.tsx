import Link from "next/link"

/**
 * The Recruiting Command Center announcement (Matt approved the text and quote, 19 Oct 2026).
 * Coach numbers are rounded down from the live platform counts on the day (108 coaches, 76 programs).
 */
export function RecruitingCommandCenterLaunchContent() {
  return (
    <div className="prose prose-lg max-w-none">
      <p>
        Recruiting is complicated. Hundreds of college programs, each with its own rules, costs and rosters, and most families are left to figure it out alone.
        Today RecruitNC opens the Recruiting Command Center to change that.
      </p>

      <p>It brings everything a family needs into one place:</p>
      <ul>
        <li>
          <strong>Every college wrestling program on one map:</strong> 438 colleges at every level, men&apos;s and women&apos;s, each with its coaches, full cost
          after aid, roster and the NC wrestlers who went there.
        </li>
        <li>
          <strong>A roadmap that adapts to your wrestler:</strong> what to do each year, the exact dates college coaches may call and visit for your
          wrestler&apos;s class, and every rule explained.
        </li>
        <li>
          <strong>Compare colleges side by side, built around your wrestler:</strong> your grades, your results and your goals, measured against each
          college&apos;s academics, roster, cost and campus. Is this a good place for me? Now you can see it.
        </li>
        <li>
          <strong>Scout, your personal assistant for your athlete&apos;s recruiting journey:</strong> compliance, timelines, which colleges fit, what they
          cost, and even drafting emails to coaches. Scout knows your wrestler and where you are in the process.
        </li>
      </ul>

      <p>
        What makes it different: college coaches are already here. More than 100 college coaches from more than 75 programs use RecruitNC to find and
        follow NC wrestlers, and families can see which programs viewed their wrestler&apos;s profile.
      </p>

      {/* The article style adds the quote marks; the name sits outside the quote. */}
      <figure>
        <blockquote>
          <p>
            As a wrestling parent, I&apos;ve been through this. The rules, the timelines, the costs: nobody hands you a map. Now there is one. The Command
            Center, and Scout alongside it, walk a family through every step from 8th grade to signing day.
          </p>
        </blockquote>
        <figcaption className="text-base font-semibold">Matt Hickey, NC United</figcaption>
      </figure>

      <div className="not-prose my-8 text-center">
        <Link
          href="/command-center"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#D3B574] px-7 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0A1628] no-underline hover:bg-[#e2c98d]"
        >
          Learn more →
        </Link>
      </div>
    </div>
  )
}
