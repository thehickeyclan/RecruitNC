import { ShieldAlert } from "lucide-react"

/**
 * The notice on every rules page (Matt, 13 Oct 2026: "rules should be validated... language that
 * protects us"). One wording, in one place, so no page carries a weaker version of it.
 *
 * It says three things a family must not miss: this is education and not advice, the governing
 * body's current document controls over anything written here, and who to confirm with before
 * acting. It is shown in full, at reading size - a notice nobody can read protects nobody.
 */
export function LearnDisclaimer({ checkedLabel }: { checkedLabel: string }) {
  return (
    <aside
      aria-label="Verify before you act"
      className="mt-8 rounded-xl border border-amber-300/30 bg-amber-300/[0.07] p-5 text-sm leading-6 text-white/80"
    >
      <p className="flex items-center gap-2 text-base font-bold text-white">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-200" aria-hidden /> Verify before you act
      </p>
      <p className="mt-2">
        This library is general education for wrestling families. It is not legal, eligibility or compliance advice,
        and RecruitNC and NC Wrestling United are not a governing body and do not speak for one.
      </p>
      <p className="mt-2">
        The rules are written, interpreted and changed by the NCAA, the NAIA, the NJCAA, the NCHSAA and each college,
        and they can change during the year. Every section names its source and this page shows when it was last
        checked ({checkedLabel}). Where anything here differs from the governing body&apos;s current rule, the
        governing body&apos;s rule controls.
      </p>
      <p className="mt-2">
        Before any decision that could affect eligibility, a scholarship or a signing - accepting prize money or an
        NIL deal, taking a visit, committing, signing - confirm the rule with the college&apos;s compliance office,
        your high school athletic director or the governing body itself. A wrestler&apos;s own situation can change
        how a rule applies.
      </p>
      <p className="mt-2 text-white/60">
        RecruitNC and NC Wrestling United make no guarantee that this information is complete or current and are not
        responsible for decisions made in reliance on it. If something looks out of date,{" "}
        <a href="/contact" className="underline hover:text-white">
          tell us
        </a>
        .
      </p>
    </aside>
  )
}
