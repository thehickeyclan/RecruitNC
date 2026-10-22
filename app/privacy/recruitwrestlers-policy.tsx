import { ContactEmail } from "@/components/recruiting/contact-email"

/**
 * RecruitWrestlers' privacy policy, shown on www.recruitwrestlers.com/privacy (Matt, 22 Oct 2026:
 * "update our privacy policy"), from the 20 October draft. Rendered on the server for that address
 * only, so none of it is in NC United's page.
 *
 * The draft's open items for the attorney, as written here (still worth their review):
 *   - Operator: "Guild Ventures", no entity type or state until confirmed.
 *   - NC United: states today's fact (same platform, shared profiles, one account), no licence terms.
 *   - Payments: billed by Guild Ventures (recruiting memberships moved to its Stripe, 22 Oct).
 *   - Children: "not directed to children under 13"; no minimum account age stated.
 *   - Breaches: notified "in line with the law where they live".
 *   - No state-specific rights section and no mailing address yet.
 */
const H2 = "text-xl font-bold text-white"
const H3 = "mt-5 font-semibold text-[#A3E635]"

export function RecruitWrestlersPolicy() {
  return (
    <main className="min-h-screen bg-[#0B1426] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold tracking-[0.2em] text-[#A3E635]">RECRUITWRESTLERS</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[#A8B3C5]">Last updated 22 October 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-[#D6E1EE]">
          <section>
            <p>
              RecruitWrestlers is a college wrestling recruiting service operated by Guild Ventures
              (&ldquo;RecruitWrestlers&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy covers
              www.recruitwrestlers.com. We collect as little as we can, we do not sell anything about
              you, and we do not use advertising or tracking software.
            </p>
            <p className="mt-3">
              RecruitWrestlers also powers RecruitNC, the recruiting service on NC United
              Wrestling&apos;s website. The two run on the same platform and share athlete profiles
              and results, and an account works on both.
            </p>
          </section>

          <section>
            <h2 className={H2}>What we collect</h2>

            <h3 className={H3}>Accounts</h3>
            <p className="mt-2">
              When you create an account we collect your name, email address and a password, or the
              name and email Google shares with us if you sign in with Google. Passwords are handled
              by our sign-in provider and stored only as a one-way hash; we never see them. College
              coaches also give us a cell number and the program they coach, so we can confirm who
              they are.
            </p>

            <h3 className={H3}>Athlete profiles</h3>
            <p className="mt-2">
              Profiles show published sports information: name, school, class year, weight, results,
              rankings and college commitment, much of it from public state and national tournament
              results. Athletes and families can add a photo, highlight video, cell number, GPA and
              test scores to their own profile. Contact details and academics are never public.
            </p>

            <h3 className={H3}>Scouting reports for college coaches</h3>
            <p className="mt-2">
              A college coach can open a scouting report on an athlete. Most of it is competition
              record: results, notable wins and losses, rankings. For a college coach account, a
              report and the athlete&apos;s profile also show the athlete&apos;s cell number, contact
              email, GPA and test scores. Coaches get this access when they sign up; we then check
              every coach by hand against their program&apos;s published staff directory, and a coach
              we cannot confirm loses access. Every copy of a report carries the name of the coach it
              was prepared for.
            </p>
            <p className="mt-2">
              Anyone else who can reach a report, including a paying subscriber, sees the competition
              record with no contact details and no academics. Leaving a field blank keeps it out of
              the report entirely.
            </p>

            <h3 id="coach-views" className={H3}>When a college coach views a profile</h3>
            <p className="mt-2">
              When a signed-in college coach opens an athlete&apos;s profile, the athlete&apos;s family
              can see that the coach&apos;s program viewed it, and when. The coach&apos;s own name is
              never shown to the family.
            </p>

            <h3 className={H3}>Messages from college coaches</h3>
            <p className="mt-2">
              A college coach we have reviewed can send a message to an athlete. Coaches start every
              conversation; athletes and families can reply but cannot start one. Each conversation is
              visible to the athlete and to every parent or guardian linked to the profile. We store
              the messages, and our staff can read them to keep the service safe and to deal with
              anything reported to us. Any message can be reported, and a family can stop messages
              from a coach at any time.
            </p>

            <h3 className={H3}>Scout, the AI recruiting assistant</h3>
            <p className="mt-2">
              Questions you type into Scout are sent to our servers and to the AI provider that
              generates the answer, and are logged so we can review answer quality. Please do not put
              sensitive personal information into a question.
            </p>

            <h3 className={H3}>Recruiting Command Center</h3>
            <p className="mt-2">
              If you use the Command Center we store what you enter there, such as your college list,
              notes, the contacts you log from college coaches and your recruiting plan, so the tools
              work for you. It is visible only to your account and the parents or guardians linked to
              your wrestler.
            </p>

            <h3 className={H3}>Website usage</h3>
            <p className="mt-2">
              The website uses Vercel Web Analytics to count page views, which pages are visited and
              roughly where visitors come from (country, browser, device type). It does not use
              cookies, does not follow you to other sites, and does not identify you. Our servers also
              keep routine logs, including IP addresses, for security and troubleshooting.
            </p>

            <h3 className={H3}>Cookies</h3>
            <p className="mt-2">
              The website sets cookies only to keep you signed in and to make the site work. We do not
              use advertising or cross-site tracking cookies.
            </p>
          </section>

          <section>
            <h2 className={H2}>What we do not collect</h2>
            <p className="mt-2">
              No advertising and no third-party trackers. We do not collect your location, contacts or
              browsing activity, and we never see or store card numbers.
            </p>
          </section>

          <section>
            <h2 className={H2}>Payments</h2>
            <p className="mt-2">
              Memberships (Insider and the Recruiting Command Center) are billed by Guild Ventures and
              processed by Stripe. Card details go directly to Stripe and never reach our servers. We
              keep a record of what was paid for and by whom. Stripe&apos;s own privacy policy governs
              the payment itself.
            </p>
          </section>

          <section>
            <h2 className={H2}>Children</h2>
            <p className="mt-2">
              RecruitWrestlers is for high school wrestlers, their families and college coaches. It is
              not directed to children under 13. Many athletes on it are under 18: information about a
              minor comes from their parent or guardian, from published tournament results, or from
              the athlete with a parent or guardian linked to the profile. We use it only to run the
              recruiting service. We do not build advertising profiles and we do not sell or share
              children&apos;s information. A parent or guardian may ask us at any time what we hold
              about their child, and ask us to correct or delete it.
            </p>
          </section>

          <section>
            <h2 className={H2}>Who we share it with</h2>
            <p className="mt-2">
              Only the services needed to operate: Supabase (database and sign-in), Vercel (website
              hosting and page-view counts), Stripe (payments), our email and text-message providers
              (alerts and account messages), and our AI provider for Scout. They process data on our
              behalf. College coaches see what is described above under scouting reports. We do not
              sell personal information, and we do not share it for advertising.
            </p>
          </section>

          <section>
            <h2 className={H2}>How we protect it</h2>
            <p className="mt-2">
              Everything travels over encrypted connections (HTTPS). Our database enforces access
              rules row by row, so a signed-in user can reach only what their role allows, and contact
              details and academics are never public. Only the staff who need it can reach the full
              data. No system is perfectly secure, but we take reasonable steps to protect what we
              hold.
            </p>
          </section>

          <section>
            <h2 className={H2}>If something goes wrong</h2>
            <p className="mt-2">
              If we learn that personal information has been accessed without permission, we will
              investigate straight away, secure our systems, and notify the families and coaches
              affected as quickly as we can and in line with the law where they live, telling them
              what happened and what we are doing about it.
            </p>
          </section>

          <section>
            <h2 className={H2}>How long we keep it</h2>
            <p className="mt-2">
              Account and profile information is kept while your account is open. Payment records are
              kept as long as tax and accounting rules require. Profiles of wrestlers who have
              graduated high school are removed unless a family claimed them, a college coach saved
              them, or they carry a college commitment. You can ask us to delete your information
              sooner.
            </p>
          </section>

          <section>
            <h2 className={H2}>Your choices</h2>
            <p className="mt-2">
              You can browse the public pages without an account, stop messages from any coach, and
              ask us to access, correct or delete what we hold. Email us and we will handle it.
            </p>
          </section>

          <section>
            <h2 className={H2}>Changes to this policy</h2>
            <p className="mt-2">
              When we change this policy we will post the new version here and update the date at the
              top.
            </p>
          </section>

          <section>
            <h2 className={H2}>Contact</h2>
            <p className="mt-2">
              RecruitWrestlers, a Guild Ventures company
              <br />
              <ContactEmail link className="text-[#A3E635] underline" />
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
