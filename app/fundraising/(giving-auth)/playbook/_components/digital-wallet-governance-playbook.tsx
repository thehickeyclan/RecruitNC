import { HardLink } from "@/components/hard-link"

/**
 * Shared playbook block: Digital Wallet vs informal apps, tied to 501(c)(3) governance.
 * Keep claims aligned with Profile → Fundraise (“Digital Wallet”) UI and NC United policy.
 */
export function DigitalWalletGovernancePlaybook() {
  return (
    <section
      className="mt-10 space-y-5 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/55 px-4 py-6 sm:px-6"
      aria-labelledby="digital-wallet-governance-heading"
    >
      <div>
        <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A94A]">
          After the gift lands
        </p>
        <h2
          id="digital-wallet-governance-heading"
          className="font-[family-name:var(--font-fundraising-display)] mt-2 text-xl font-black uppercase leading-snug tracking-tight text-white sm:text-2xl"
        >
          Digital Wallet · 501(c)(3) governance (not Venmo economics)
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/85">
          Donors give through <strong className="text-white">NC United nonprofit checkout</strong>; NC United retains control of all gifts, records donor preference
          for reporting and reimbursement workflow under campaign policy (not personal custody for the athlete&apos;s wallet).
          Families track ledger views in RecruitNC under{" "}
          <strong className="text-white">Profile → Digital wallet</strong> (coins / Wallet tab). Informal Venmo/Cash App puts money{" "}
          <strong className="text-white">outside</strong> that nonprofit custody chain — so you lose institutional lanes, unified receipts, and an
          organization-backed trail for how dollars move after checkout.
        </p>
      </div>

      <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-white/82 marker:text-[#C8A94A]">
        <li>
          <strong className="text-white/95">Governance &amp; documentation.</strong> Donors who complete nonprofit checkout receive NC United acknowledgement
          materials through exempt-organization rails — not “friends paying friends.” Employer matching, business gifts, and foundations overwhelmingly expect that
          structure; whether any particular gift is deductible belongs with each donor&apos;s CPA.
        </li>
        <li>
          <strong className="text-white/95">Ledger-backed balances.</strong> The wallet&apos;s <strong className="text-white">Raised</strong> view
          aggregates paid checkout amounts linked through donor preference to your wrestler&apos;s NC United codes for the active campaign window (same
          aggregates families already trust on public athlete pages and the hub). It&apos;s one story — not a screenshot of personal notifications.
        </li>
        <li>
          <strong className="text-white/95">Reimbursements with records.</strong> Eligible training and competition costs run through NC United{" "}
          <strong className="text-white">expense / reimbursement requests</strong> from the wallet workflow — reviewed against policy, then paid when
          approved. That produces a <strong className="text-white">Spent</strong> line families can reconcile instead of hunting Venmo threads for
          “did we already pay that hotel?”
        </li>
        <li>
          <strong className="text-white/95">Program holds &amp; allocations.</strong> Some balances show amounts reserved toward approved NC United programming
          (for example reimbursed training costs or allocations families initiate under NC United policy) so money committed to wrestling development
          doesn&apos;t disappear from the reconciliation view — you still see{" "}
          <strong className="text-white">Available</strong> after reimbursements and documented holds.
        </li>
        <li>
          <strong className="text-white/95">Card fees absorbed on hub campaigns.</strong> NC United absorbs Stripe/card processing on hub fundraising
          checkouts so ledger totals attributed under campaign rules align with donor-paid amounts — unlike typical crowdfunding rake or opaque peer-to-peer
          fees (always confirm current campaign rules if something changes season to season).
        </li>
        <li>
          <strong className="text-white/95">Speed without hiding the nonprofit.</strong> Paid checkout flows through nonprofit banking rails; balances
          update on the cadence Stripe + reconciliation allow. Once a reimbursement is <strong className="text-white">approved</strong>, ops targets
          fast payout — often same business day when paperwork is complete (bank cutoffs and staffing can shift timing).
        </li>
        <li>
          <strong className="text-white/95">Transparency where donors &amp; boards expect it.</strong> Public athlete pages and hub Training Fund contribution
          rankings show donor-visible activity where campaigns publish it; the wallet shows family-facing raised vs spent vs available — together they answer “what came
          in” and “what moved out under policy.”
        </li>
        <li>
          <strong className="text-white/95">Thank-you reminders tied to real gifts.</strong> The same Digital wallet tab surfaces supporter prompts so athlete
          gratitude stays attached to recorded supporters — not divorced from the reconciliation view (still read the gratitude section above: texts minimum,
          notes preferred).
        </li>
      </ul>

      <p className="text-xs leading-relaxed text-white/55">
        Eligibility, reimbursement approval, and tax outcomes depend on NC United policy and IRS rules — coordinate with NC United ops and your CPA.
        Open{" "}
        <HardLink href="/profile" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          Profile
        </HardLink>{" "}
        → <strong className="text-white/75">Digital wallet</strong> after linking wrestlers under Family &amp; athletes.
      </p>
    </section>
  )
}
