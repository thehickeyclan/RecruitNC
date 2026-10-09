import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How NC United Wrestling collects, uses and protects information in the NC United app and on ncwrestlingunited.com.",
}

/** Public and unauthenticated on purpose: Apple requires App Review to reach this without an account. */
export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-rnc-ink px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold tracking-[0.2em] text-rnc-gold">NC UNITED WRESTLING</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[#A8BBD1]">Last updated 8 October 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-[#D6E1EE]">
          <section>
            <p>
              NC United Wrestling is a North Carolina non-profit. This policy covers the NC United
              iPhone app and ncwrestlingunited.com. We collect as little as we can, we do not sell
              anything about you, and we do not use advertising or tracking software.
            </p>
            <p className="mt-3">
              The app and the website do not collect the same things. The app is deliberately the
              lighter of the two — it never asks for a date of birth, and most of it works without
              an account at all. Where something below applies to only one, we say so.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">What we collect</h2>

            <h3 className="mt-5 font-semibold text-rnc-gold">Accounts</h3>
            <p className="mt-2">
              When you create an account we collect your name, email address and a password, or the
              name and email Google shares with us if you sign in with Google. Passwords are handled
              by our sign-in provider and stored only as a one-way hash; we never see them. College
              coaches also give us a cell number and the program they coach, so we can confirm who
              they are.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Practice and drop-in registration</h3>
            <p className="mt-2">
              When a parent or guardian reserves a spot at an in-person practice we collect the
              wrestler&apos;s name, graduation year and weight, and the parent or guardian&apos;s
              name, email address and phone number. We also record that the Waiver and Release of
              Liability was accepted, and which version of it. We need this to run a safe practice,
              to know who is on the mat, and to reach a guardian.
            </p>
            <p className="mt-2">
              We ask for a graduation year rather than a date of birth. Drop-ins are open to middle
              and high school wrestlers, and the graduation year answers that without us holding a
              child&apos;s exact date of birth. We do not ask for the wrestler&apos;s own phone
              number — the guardian&apos;s is the number we would call.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Alerts</h3>
            <p className="mt-2">
              If you turn on alerts, we store the notification token your device is issued, whether it
              is an iPhone or Android device, and which alert types you chose. The token identifies a
              device, not a person, and we do not link it to a name. Turning alerts off in iOS
              Settings stops delivery; ask us and we will delete the record.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Data Dawg</h3>
            <p className="mt-2">
              Questions you type into Data Dawg are sent to our servers and to the AI provider that
              generates the answer, and are logged so we can review answer quality. Please do not put
              personal or sensitive information into a question.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Athlete records (website only)</h3>
            <p className="mt-2">
              On the website, coaches and NC United staff working in the admin and school portals can
              record additional detail on an athlete&apos;s record, including a date of birth, contact
              email and phone number, where that is needed for eligibility, recruiting or team
              administration. Athletes and families can add a cell number, GPA and test scores
              themselves on their own profile. These fields are never public, and are not collected or
              shown anywhere in the app.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Scouting reports for college coaches</h3>
            <p className="mt-2">
              A college coach can open a scouting report on an athlete. Most of what it contains is
              competition record — results, notable wins and losses, rankings. For a college coach
              account, a report and the athlete&apos;s profile also show the athlete&apos;s cell
              number, contact email, GPA and test scores. Coaches get this access when they sign up;
              we then check every coach by hand against their program&apos;s published staff
              directory, and a coach we cannot confirm loses access. Every copy of a report carries
              the name of the coach it was prepared for.
            </p>
            <p className="mt-2">
              Anyone else who can reach a report — including a paying subscriber — sees the competition
              record with no contact details and no academics. Leaving a field blank on the profile
              keeps it out of the report entirely, and families can ask us to remove any of it at any
              time.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Messages from college coaches</h3>
            <p className="mt-2">
              A college coach we have reviewed can send a message to an athlete. Coaches start every
              conversation; athletes and families can reply but cannot start one. Each conversation
              is visible to the athlete and to every parent or guardian linked to the profile, always.
              We store the messages, and NC United staff can read them to keep the service safe and
              to deal with anything reported to us. Alerts on a lock screen name the coach and their
              program, never the text of the message; families not signed in to the app are told by
              email. Any message can be reported, and a family can stop messages from a coach at any
              time.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Website usage</h3>
            <p className="mt-2">
              The website uses Vercel Web Analytics to count page views, which pages are visited and
              roughly where visitors come from (country, browser, device type). It does not use
              cookies, does not follow you to other sites, and does not identify you. Our servers
              also keep routine logs, including IP addresses, for security and troubleshooting.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Cookies</h3>
            <p className="mt-2">
              The website sets cookies only to keep you signed in and to make the site work. We do
              not use advertising or cross-site tracking cookies. You can clear or block cookies in
              your browser, but you will need to sign in again.
            </p>

            <h3 className="mt-5 font-semibold text-rnc-gold">Athlete profiles and results</h3>
            <p className="mt-2">
              Commitments, rankings, results and athlete profiles shown in the app are published
              sports information — name, school, class year, weight and college commitment. Athletes
              and families may ask us to correct or remove a profile at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">What we do not collect</h2>
            <p className="mt-2">
              The app contains no advertising, no analytics or tracking software, and no third-party
              trackers. The website has no advertising and no third-party trackers either. We do not collect your location, contacts, photos or browsing activity, and we
              never see or store card numbers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">Payments</h2>
            <p className="mt-2">
              Payments for practices, memberships and events are processed by Stripe. Card details go
              directly to Stripe and never reach our servers. We keep a record of what was paid for and
              by whom so we can honour the registration. Stripe&apos;s own privacy policy governs the
              payment itself.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">Children</h2>
            <p className="mt-2">
              Our programmes serve wrestlers under 18, and registration information about a minor is
              provided by their parent or guardian, not by the child. We use it only to run the
              programme the family signed up for. We do not build advertising profiles and we do not
              sell or share children&apos;s information. A parent or guardian may ask us at any time
              what we hold about their child, and ask us to correct or delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">Who we share it with</h2>
            <p className="mt-2">
              Only the services needed to operate: Supabase (database and sign-in), Vercel (website
              hosting and page-view counts), Stripe (payments), Expo and Apple (notification
              delivery), our email and text-message providers (alerts and account messages), and our
              AI provider for Data Dawg answers. They
              process data on our behalf. We do not sell personal information, and we do not share it
              for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">How we protect it</h2>
            <p className="mt-2">
              Everything travels over encrypted connections (HTTPS). Our database enforces access
              rules row by row, so a signed-in user can reach only what their role allows, and fields
              like contact details and academics are never public. Only the NC United staff who need
              it can reach the full data. No system is perfectly secure, but we take reasonable steps
              to protect what we hold.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">If something goes wrong</h2>
            <p className="mt-2">
              If we learn that personal information has been accessed without permission, we will
              investigate straight away, secure our systems, and notify the families and coaches
              affected as quickly as we can and in line with North Carolina law, telling them what
              happened and what we are doing about it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">How long we keep it</h2>
            <p className="mt-2">
              Registration and payment records are kept while they are needed for the programme and for
              our non-profit financial records. Notification tokens are deleted when a device
              uninstalls the app or when Apple tells us the token is dead. You can ask us to delete
              your information sooner.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">Your choices</h2>
            <p className="mt-2">
              You can turn alerts off in iOS Settings, browse commitments, rankings and the calendar
              without an account, stop messages from any coach, and ask us to access, correct or
              delete what we hold. You can also delete your account from inside the app. Email us and we
              will handle it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">Changes to this policy</h2>
            <p className="mt-2">
              When we change this policy we will post the new version here and update the date at
              the top.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">Contact</h2>
            <p className="mt-2">
              NC United Wrestling
              <br />
              <a className="text-rnc-gold underline" href="mailto:info@ncwrestlingunited.com">
                info@ncwrestlingunited.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
