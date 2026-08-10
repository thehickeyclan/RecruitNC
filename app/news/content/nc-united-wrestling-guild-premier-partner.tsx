import Link from "next/link"

export function NcUnitedWrestlingGuildPremierPartnerContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          <strong>RALEIGH, N.C. — August 9, 2026</strong> — NC United Wrestling today announced <strong>The Wrestling
          Guild</strong> as a Premier Partner of the 2026 <strong>Tournament of Champions</strong>, taking place
          September 18–19 in Apex, North Carolina.
        </p>
        <p>
          As part of the partnership, The Wrestling Guild is committing <strong>$1,000 directly back to the North
          Carolina wrestling community</strong>, awarding <strong>10 wrestlers $100 each in Wrestling Guild training
          credit.</strong>
        </p>
        <p>
          Beginning today, <strong>every new wrestler who creates a free Wrestling Guild account between August 9 and
          September 15 will automatically be eligible</strong> for one of the ten awards. No purchase is necessary.
        </p>
        <p>
          The 10 recipients will be announced and recognized at the <strong>Tournament of Champions on September
          19</strong>. Wrestlers do not have to be competing in the Tournament of Champions to be eligible.
        </p>
      </section>

      <section>
        <h2>Tapping Into North Carolina&apos;s Wrestling Superpower</h2>
        <p>
          The Wrestling Guild was built around a simple idea: some of the best wrestling resources in the country are
          already in our backyard.
        </p>
        <p>
          North Carolina is home to outstanding college programs, accomplished current and former NCAA athletes, and
          elite coaches with years of experience at the highest levels of the sport.
        </p>
        <p>
          The Guild creates a marketplace where families can discover and book <strong>elite coaches for private
          lessons and small-group training</strong>, with a heavy focus on current and former NCAA wrestlers.
        </p>
        <p>
          For wrestlers, it creates greater access to high-level instruction and mentorship. For coaches and college
          athletes, it creates an opportunity to share their knowledge, connect with the next generation, and earn
          income through the sport.
        </p>
      </section>

      <section>
        <h2>More Than Training</h2>
        <p>The Wrestling Guild&apos;s vision extends beyond the training room.</p>
        <p>
          The platform is building a broader marketplace specifically for wrestling, where members can <strong>buy,
          sell, and trade wrestling shoes, team-issued gear, apparel, and other wrestling equipment.</strong>
        </p>
        <p>
          The goal is to create one destination where the wrestling community can connect around <strong>training,
          gear, and opportunity.</strong>
        </p>
      </section>

      <section>
        <h2>Partnership Dollars Going Back Into Wrestling</h2>
        <p>
          The partnership also reflects the philosophy behind NC United&apos;s Tournament of Champions sponsorship
          program:
        </p>
        <p>
          <strong>
            100% of partnership and sponsorship dollars go directly back into the North Carolina wrestling community.
          </strong>
        </p>
        <p>
          Rather than simply placing a sponsor logo at the event, NC United and its partners are working to turn those
          dollars into tangible opportunities for wrestlers.
        </p>
        <p>The Wrestling Guild&apos;s inaugural Premier Partnership does exactly that:</p>
        <p>
          <strong>
            $1,000 committed.
            <br />
            10 wrestlers.
            <br />
            $100 toward training for each.
          </strong>
        </p>
      </section>

      <section>
        <h2>Create a Free Wrestling Guild Account</h2>
        <p>
          From <strong>August 9 through September 15</strong>, every new wrestler registration on The Wrestling Guild
          will automatically be entered for an opportunity to receive one of the ten $100 training credits.
        </p>
        <p>
          Creating an account is <strong>free</strong>, and no purchase is necessary.
        </p>
        <p>
          The 10 recipients will be announced September 19 at the <strong>NC United Tournament of Champions in
          Apex</strong>.
        </p>
        <p>
          <a href="https://www.wrestlingguild.com/">Create a free Wrestling Guild account</a>
        </p>
        <p>
          <strong>Train. Connect. Elevate.</strong>
        </p>
      </section>

      <section>
        <div className="not-prose rounded-xl border border-[#D3B574]/30 bg-[#13294B] p-6 text-center text-white sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#D3B574]">
            The Wrestling Guild × NC United
          </p>
          <p className="mt-3 text-xl font-black sm:text-2xl">2026 Tournament of Champions Premier Partner</p>
          <p className="mt-2 text-sm text-white/70">September 18–19 · Apex, North Carolina</p>
          <Link
            href="/tournament-of-champions"
            className="mt-5 inline-flex rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-bold text-[#13294B] no-underline"
          >
            Explore the Tournament of Champions
          </Link>
        </div>
      </section>
    </div>
  )
}
