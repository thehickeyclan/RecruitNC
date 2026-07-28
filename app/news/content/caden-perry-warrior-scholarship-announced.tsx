import Image from "next/image"
import Link from "next/link"

export function CadenPerryWarriorScholarshipAnnouncedContent() {
  return (
    <div className="space-y-10">
      <figure className="not-prose overflow-hidden rounded-xl border border-[#D3B574]/40 bg-[#061224] shadow-sm">
        <Image
          src="/scholarships/caden-perry/warrior-scholarship-share-card-wide.png"
          alt="The Caden Perry Warrior Scholarship — $1,000 wrestling-support award"
          width={1448}
          height={1086}
          className="mx-auto h-auto w-full max-w-3xl"
          priority
        />
      </figure>

      <div className="not-prose rounded-2xl border border-[#D3B574]/45 bg-[#13294B] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D3B574]">
          The Caden Perry Warrior Scholarship
        </p>
        <h2 className="mt-3 text-2xl font-black leading-tight text-white">
          The future is bright for those who refuse to quit.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/72">
          One North Carolina wrestler will receive $1,000 in wrestling support, applied directly to documented
          training and competition expenses.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/fundraising/scholarships/caden-perry"
            className="inline-flex rounded-xl bg-[#D3B574] px-5 py-3 text-sm font-bold text-[#071529] no-underline transition hover:bg-white"
          >
            Learn more
          </Link>
          <Link
            href="/fundraising/scholarships/caden-perry/donate"
            className="inline-flex rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white no-underline transition hover:border-[#D3B574] hover:text-[#D3B574]"
          >
            Donate to the fund
          </Link>
        </div>
      </div>

      <section>
        <p>
          NC United is proud to announce the inaugural <strong>Caden Perry Warrior Scholarship</strong>, a
          wrestling-support award created to honor courage, resilience, discipline, heart and an unwavering refusal
          to quit.
        </p>
        <p>
          Caden Perry embodied the warrior spirit wrestling is supposed to build. His legacy is bigger than any one
          bracket, team or tournament. This award will recognize a North Carolina wrestler whose response to genuine
          adversity reflects that same spirit.
        </p>
      </section>

      <section>
        <h2>What the award supports</h2>
        <p>
          The year-one award is <strong>$1,000 in wrestling support</strong>. It is not limited to college costs and
          it is not based on rankings, records, championships or recruiting status.
        </p>
        <p>
          The funds are intended to help with documented wrestling-related expenses, including club dues, private
          lessons, small-group training, camps, tournament fees, travel, gear and other approved training or
          competition costs.
        </p>
        <p>
          NC United has committed the first $1,000 to launch the fund. Additional donations build on that commitment
          and help expand the award’s impact for North Carolina wrestlers facing adversity.
        </p>
      </section>

      <section>
        <h2>Who can be nominated</h2>
        <p>
          Any active North Carolina wrestler in grades 6–12 may be nominated. The wrestler does not have to compete
          in the Tournament of Champions, does not have to be an NC United member and does not need a certain record,
          ranking or set of accolades.
        </p>
        <p>
          Coaches, parents, guardians, teachers, counselors, administrators, teammates and community members may
          submit nominations. Athletes may not nominate themselves.
        </p>
      </section>

      <section>
        <h2>Nominations and presentation</h2>
        <p>
          Nominations open <strong>August 1</strong> and close <strong>August 30, 2026</strong>. The inaugural
          recipient will be honored on <strong>September 19, 2026</strong>, during the NC United Tournament of
          Champions in Apex.
        </p>
        <p>
          The nomination asks for a real example of adversity — what happened, how the athlete responded and what
          that response revealed about their character. Authenticity and specific details matter more than polished
          writing or production quality.
        </p>
      </section>

      <section>
        <h2>Learn more or support the fund</h2>
        <p>
          The full scholarship page includes Caden’s story, award details, nomination timing, fund status and a secure
          donation link.
        </p>
        <p>
          <Link href="/fundraising/scholarships/caden-perry">Visit The Caden Perry Warrior Scholarship page</Link>
          <br />
          <Link href="/tournament-of-champions">Visit the Tournament of Champions event page</Link>
        </p>
      </section>
    </div>
  )
}
