/**
 * RecruitWrestlers' privacy policy, at www.recruitwrestlers.com/privacy (middleware rewrites it
 * here). Public before launch: the Chrome Web Store needs it for the Interest Form Helper, and it
 * holds no athlete data. Text approved by Matt, 22 Oct 2026. NC United's own policy is /privacy on
 * app.ncwrestlingunited.com.
 */
import type { Metadata } from "next"

import { RwLogo } from "@/components/recruiting/rw-mark"
import { NATIONAL_BRAND } from "@/lib/recruiting/brand"

export const metadata: Metadata = {
  metadataBase: new URL(`https://${NATIONAL_BRAND.domain}`),
  title: { absolute: "Privacy Policy | RecruitWrestlers" },
  description: "How RecruitWrestlers handles personal information.",
  applicationName: NATIONAL_BRAND.name,
  manifest: null,
  alternates: { canonical: "/privacy" },
  icons: { icon: [{ url: "/recruitwrestlers/favicon-32.png", sizes: "32x32", type: "image/png" }] },
}

const h2 = "mt-8 text-lg font-bold text-white"

export default function RecruitWrestlersPrivacy() {
  return (
    <div className="min-h-screen bg-[#0B1426] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <a href="/" aria-label={NATIONAL_BRAND.name}>
            <RwLogo className="h-8 w-auto" />
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#A8B3C5]">Last updated 22 October 2026</p>
        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-[#D6DEEA]">
          <p>
            RecruitWrestlers is a college wrestling recruiting service from Guild Ventures LLC. In North Carolina it is offered through NC United, whose families use it at
            app.ncwrestlingunited.com. We collect as little as we can, we do not sell personal information, and we do not use advertising or tracking software.
          </p>

          <h2 className={h2}>Accounts</h2>
          <p>
            Your name and email address, and a password handled by our sign-in provider and stored only as a one-way hash. College coaches also give us a cell number and
            the program they coach.
          </p>

          <h2 className={h2}>Wrestler profiles</h2>
          <p>
            Competition results come from public tournament records. Families may add a cell number, GPA, test scores and a highlight video. Contact details, GPA and test
            scores are never public; approved college coaches can see them on a wrestler&apos;s profile and scouting report.
          </p>

          <h2 className={h2}>Interest form answers</h2>
          <p>
            In the Recruiting Command Center a family can save the answers college recruiting questionnaires ask for, so they are typed once: the wrestler&apos;s date of
            birth, home address and height; parent or guardian names and contact details; high school and club coach contacts; class rank; and NCAA Eligibility Center ID.
            Only the wrestler&apos;s own family and our staff can read these. They are never public, never shown to college coaches, and never sent to a college by us.
          </p>

          <h2 className={h2}>The Interest Form Helper (Chrome extension)</h2>
          <p>
            The helper is optional. When a family clicks Fill on a college&apos;s questionnaire, it reads their saved answers from us using their own signed-in session and
            types them into that page in their browser. The family checks the form and presses the college&apos;s Submit button themselves; what they submit goes to that
            college under the college&apos;s own privacy policy. The helper tells us only that a college&apos;s form was submitted, so we can mark it with the date and time.
            It reads nothing else from the pages you visit.
          </p>

          <h2 className={h2}>Sharing</h2>
          <p>
            We use service providers to run the service (hosting, database, email, payments and AI answers); they process data only on our behalf. We do not sell or rent
            personal information.
          </p>

          <h2 className={h2}>Minors</h2>
          <p>Our wrestlers are high school students. A parent or guardian can ask us at any time to see, correct or delete their child&apos;s information.</p>

          <h2 className={h2}>Contact</h2>
          <p>
            <a className="font-semibold text-[#A3E635]" href="mailto:info@recruitwrestlers.com">
              info@recruitwrestlers.com
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
