import { TERMS_VERSION } from "@/lib/legal/consent"

/**
 * The Terms of Service (Matt's launch review, 30 Oct 2026), one text for both sites: RecruitWrestlers
 * from Guild Ventures LLC at recruitwrestlers.com, and NC United's recruiting pages. Drafted for the
 * launch and to be reviewed by counsel; TERMS_VERSION changes with any material edit, and sign-up
 * records the version each person agreed to (lib/legal/consent.ts).
 */
export function TermsBody({ operator, service, email }: { operator: string; service: string; email: string }) {
  const h2 = "mt-8 text-lg font-bold text-white"
  const updated = new Date(`${TERMS_VERSION.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-[#D6DEEA]">
      <p className="text-sm text-[#A8B3C5]">Last updated {updated}</p>
      <p>
        These terms are an agreement between you and {operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for the use of {service}: its website, accounts, rankings,
        profiles, the Recruiting Command Center, Scout and messaging (the &ldquo;service&rdquo;). By creating an account or using the service you agree to them and
        to our Privacy Policy. If you do not agree, do not use the service.
      </p>

      <h2 className={h2}>1. Who may use the service</h2>
      <p>
        You must be at least 13 to have an account. A wrestler under 13 may have a profile only through a parent or guardian&apos;s account. If you are 13 to 17,
        a parent or guardian must agree to these terms for you, and they are responsible for your use of the service. You agree to give accurate information,
        keep your password private, and use one account for yourself. A parent may manage the profiles of their own children.
      </p>
      <p>
        College coaching accounts are for people who coach or recruit for a college wrestling program. We may confirm a coach against their program&apos;s staff
        directory at any time and remove access that does not check out.
      </p>

      <h2 className={h2}>2. Wrestler profiles and results</h2>
      <p>
        Competition results come from public tournament records and are compiled by us. A wrestler or their parent may claim the wrestler&apos;s profile and
        add information such as a photo, academics and contact details. Only the wrestler, their parent or guardian may claim a profile; claiming someone
        else&apos;s profile is not allowed and we will remove it. We may correct, combine or remove profiles and results to keep them accurate. Tell us about
        anything that is wrong and we will check it against the source.
      </p>
      <p>
        The public profiles of current high school wrestlers (name, school, class, results and honors) can appear in search engines. A wrestler&apos;s family
        can hide a profile from search engines at any time; private details such as GPA and contact information are never shown publicly.
      </p>

      <h2 className={h2}>3. Rules for college coaches</h2>
      <p>
        If you use the service as a college coach you agree to use wrestlers&apos; information only to recruit for your program; not to share, sell or export it;
        to follow the recruiting rules of your governing body (NCAA, NAIA, NJCAA or other) when you contact a wrestler; and to keep every message professional
        and appropriate for a minor. Families can see that your program viewed a profile, and parents can read every message sent to their wrestler. We may
        suspend coach access for any misuse.
      </p>

      <h2 className={h2}>4. What you may not do</h2>
      <p>
        Do not harass, threaten or exploit anyone, especially a minor; do not impersonate anyone; do not post anything unlawful or that you have no right to
        post; do not copy, scrape, resell or republish the rankings, profiles or other content except as the service allows (sharing a link is fine); do not
        try to get around a paywall, access control or security measure; and do not interfere with the service.
      </p>

      <h2 className={h2}>5. Memberships and payment</h2>
      <p>
        Paid memberships (such as Insider and the Recruiting Command Center) are billed in advance, monthly or yearly, through our payment processor, and renew
        automatically until you cancel. You can cancel at any time from your account; cancelling stops the next renewal, and you keep access until the end of
        the period you paid for. Prices are shown before you pay and may change for future periods after notice. If you think a charge is wrong, contact us.
      </p>

      <h2 className={h2}>6. Rankings, grades, Scout and guidance</h2>
      <p>
        Rankings, tournament grades, star ratings, college fit, cost figures, Scout&apos;s answers and our recruiting guides are our opinions and information,
        offered to help families and coaches. They are not guarantees of any recruiting outcome, scholarship, admission or offer, and they are not legal,
        financial or medical advice. Recruiting rules are summarised from the governing bodies&apos; documents with the date we checked them; the governing
        body&apos;s own rules control, so confirm anything important with them or the college. Scout is an AI assistant and can be wrong.
      </p>

      <h2 className={h2}>7. Content</h2>
      <p>
        The service, its design, rankings and compiled data belong to us or our licensors. Content you add, such as photos, bios and messages, stays yours; you
        give us permission to host, display and share it within the service as these terms and the Privacy Policy describe, and you confirm you have the right
        to post it. Links to other sites, such as a college&apos;s questionnaire, are governed by those sites&apos; own terms.
      </p>

      <h2 className={h2}>8. Ending your account</h2>
      <p>
        You may stop using the service and ask us to delete your account at any time. We may suspend or close an account that breaks these terms or puts others
        at risk.
      </p>

      <h2 className={h2}>9. Disclaimers and limits</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we disclaim all warranties, and we are not
        liable for indirect, incidental or consequential losses, or for more than the amount you paid us in the 12 months before the claim. Some places do not
        allow these limits, so they may not all apply to you.
      </p>

      <h2 className={h2}>10. Changes and the law that applies</h2>
      <p>
        We may update these terms; if a change is material we will say so on the service or by email, and continuing to use the service means you accept it.
        These terms are governed by the laws of the State of North Carolina.
      </p>

      <h2 className={h2}>11. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${email}`} className="underline">{email}</a>.
      </p>
    </div>
  )
}
