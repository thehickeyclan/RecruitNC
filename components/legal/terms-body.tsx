import { TERMS_VERSION } from "@/lib/legal/consent"

/**
 * The Terms of Service (Matt's launch review, 30 Oct 2026), one text for both sites: RecruitWrestlers
 * from Guild Ventures LLC at recruitwrestlers.com, and NC United's recruiting pages. Drafted for the
 * launch and to be reviewed by counsel; TERMS_VERSION changes with any material edit, and sign-up
 * records the version each person agreed to (lib/legal/consent.ts).
 *
 * 3 Nov 2026: added the four protections a consumer platform publishing minors' results needs and
 * this text had none of - a DMCA notice-and-takedown with a named copyright agent (section 8), the
 * user's promises and indemnity (11), individual arbitration with a class-action waiver (12), and
 * assignment and survival (13). Two of these are not finished by shipping the words:
 *   - Section 8 only earns the 17 U.S.C. 512(c) safe harbour once the agent is registered with the
 *     U.S. Copyright Office (dmca.copyright.gov, about $6 a year). Pass `mailingAddress` once there
 *     is one on file so the designation on the page matches the registration.
 *   - Section 12 is enforceable on how it is presented as much as on what it says, which is why the
 *     notice sits above section 1 and is repeated at sign-up. Have counsel read it before relying on it.
 */
export function TermsBody({ operator, service, email, mailingAddress }: { operator: string; service: string; email: string; mailingAddress?: string }) {
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

      <p className="rounded-md border border-white/15 bg-white/5 p-3">
        <strong className="text-white">Please read section 12 before you agree.</strong> It says that a dispute between you and us is settled by individual
        arbitration instead of in court, that you and we both give up a jury trial, and that neither of us may bring or join a class action. You keep the right
        to go to small claims court, and you may opt out of arbitration within 30 days of first agreeing to these terms.
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

      <h2 className={h2}>8. Copyright complaints</h2>
      <p>
        We respect copyright and we take down material that infringes it. If you own a photo, video or other work and believe it is on the service without your
        permission, send a notice to our copyright agent below that includes: your signature, which can be your typed name in an email; what work you own; where
        on the service the material is, in enough detail for us to find it; how to reach you; a statement that you believe in good faith the use is not
        authorized; a statement that what you have told us is accurate; and a statement, under penalty of perjury, that you own the work or are authorized to
        act for the owner. We will take it down promptly and tell whoever posted it.
      </p>
      <p>
        If your material was taken down and you believe that was a mistake, send a counter notice to the same place with your signature, what was removed and
        where it was, how to reach you, a statement under penalty of perjury that you believe it was removed by mistake, and your agreement to the jurisdiction
        of the federal court where you live. If the person who complained does not file in court within ten business days, we may put the material back.
      </p>
      <p>
        We may remove content and close the account of anyone who infringes repeatedly. Knowingly sending a false notice or counter notice can make you liable
        for damages and legal fees under 17 U.S.C. &sect; 512(f).
      </p>
      <p>
        Copyright agent for {operator}: <a href={`mailto:${email}`} className="underline">{email}</a>, with &ldquo;DMCA Notice&rdquo; in the subject line.
        {mailingAddress ? ` Notices may also be mailed to ${mailingAddress}.` : " Ask at that address for where to send a notice by mail."} This contact is only
        for copyright claims; anything else sent to it may not be read or answered.
      </p>

      <h2 className={h2}>9. Ending your account</h2>
      <p>
        You may stop using the service and ask us to delete your account at any time. We may suspend or close an account that breaks these terms or puts others
        at risk.
      </p>

      <h2 className={h2}>10. Disclaimers and limits</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we disclaim all warranties, and we are not
        liable for indirect, incidental or consequential losses, or for more than the amount you paid us in the 12 months before the claim. Some places do not
        allow these limits, so they may not all apply to you.
      </p>

      <h2 className={h2}>11. Your promises and indemnity</h2>
      <p>
        You promise that you may agree to these terms, that what you tell us is true, that you own or have permission to post whatever you add, and that you
        will use the service only for lawful purposes. If you give us information about anyone other than yourself &mdash; a photo of another wrestler, a
        commitment you are reporting, a roster, a result &mdash; you promise you have the right to give it to us, and that if that person is under 18 you have
        their parent or guardian&apos;s permission. If you agree to these terms for a school, club, program or other organization, you promise you are allowed
        to bind it.
      </p>
      <p>
        You agree to cover our reasonable costs, including legal fees, for a claim brought against us that comes out of your breach of these terms or of
        content you posted. We will tell you about any such claim, let you take part in defending it, and will not settle it in a way that costs you money or
        admits fault for you without your agreement.
      </p>

      <h2 className={h2}>12. Disputes: arbitration and class-action waiver</h2>
      <p>
        <strong className="text-white">Tell us first.</strong> If something is wrong, email us at{" "}
        <a href={`mailto:${email}`} className="underline">{email}</a> with what happened and what you want, and give us 30 days to put it right. Nearly
        everything ends here.
      </p>
      <p>
        <strong className="text-white">Arbitration.</strong> If it does not, you and we agree that any dispute arising out of these terms or the service will be
        settled by binding arbitration under the Federal Arbitration Act, run by the American Arbitration Association under its Consumer Arbitration Rules, by
        one arbitrator, and held on written submissions, by phone or video, or in person in the county where you live, whichever you choose. An arbitrator can
        award the same damages and relief a court could. We will pay the AAA&apos;s filing and arbitrator fees for a claim under $10,000 unless the arbitrator
        finds the claim was frivolous.
      </p>
      <p>
        <strong className="text-white">No class actions.</strong> You and we may each bring a claim only for ourselves, and not as a plaintiff or a class member
        in any class, consolidated or representative action; an arbitrator may not combine one person&apos;s claims with another&apos;s. If a court decides this
        paragraph cannot be enforced for a particular claim, that claim alone goes to court and the rest of this section still applies to everything else.
      </p>
      <p>
        <strong className="text-white">What this does not cover.</strong> Either of us may bring a claim in small claims court if it qualifies, and either of us
        may ask a court for an order to stop misuse of intellectual property, scraping, or anything that puts someone&apos;s safety at risk. If a claim does end
        up in court, you and we both give up the right to a jury trial. A claim must be brought within one year of when it arose, except where the law does not
        allow that limit.
      </p>
      <p>
        <strong className="text-white">Opting out.</strong> You can refuse this arbitration agreement by emailing{" "}
        <a href={`mailto:${email}`} className="underline">{email}</a> with your name and the email on your account within 30 days of first agreeing to these
        terms. Opting out is free and changes nothing else about your account. If we later change this section, you may reject the change the same way within 30
        days of being told about it, and the version you agreed to before will keep applying to you.
      </p>

      <h2 className={h2}>13. Changes, transfers and the law that applies</h2>
      <p>
        We may update these terms; if a change is material we will say so on the service or by email, and continuing to use the service means you accept it.
        These terms are governed by the laws of the State of North Carolina, and anything that belongs in court belongs in the state or federal courts of North
        Carolina.
      </p>
      <p>
        We may transfer these terms, and your account along with them, to a company related to us or to whoever takes over this business; your membership and
        everything these terms say we owe you carry over unchanged. You may not transfer your account to anyone else. Sections 4, 7, 8, 10, 11, 12 and this one
        keep applying after your account ends. If any part of these terms cannot be enforced, the rest still stands.
      </p>

      <h2 className={h2}>14. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${email}`} className="underline">{email}</a>.
      </p>
    </div>
  )
}
