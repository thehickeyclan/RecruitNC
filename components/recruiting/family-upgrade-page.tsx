import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { FamilyPlanPicker } from "@/components/recruiting/family-plan-picker"
import type { FamilyUpgrade } from "@/lib/recruiting/family-upgrade"

const card = "rounded-2xl border border-white/10 bg-[#0f1c2e]"

/** What the Command Center adds, in plain words (4 lines). */
const ADDS = [
  "A step-by-step plan, 8th grade to signing day",
  "Every college: coaches, full cost and room at your weight",
  "Your college list, Compare and coach messages in one place",
  "Scout, your recruiting assistant, any time",
]

/**
 * The Command Center for a signed-in family with no plan (Matt, 5 Nov 2026). Mandi Nelsen had
 * already claimed Tyde and was sent to the sales page written for strangers: "Find your wrestler's
 * profile", "Claim your free profile", "Sign up now". This is the short version, about them: the
 * wrestler's real numbers, what the Command Center adds, the plans and one button. Nothing here
 * asks a signed-in family to sign in, sign up or claim, unless no wrestler is linked yet; then
 * finding and claiming the wrestler comes first.
 */
export function FamilyUpgradePage({ upgrade }: { upgrade: FamilyUpgrade }) {
  const { wrestlers } = upgrade
  const names = wrestlers.map((w) => w.firstName).join(" and ")
  return (
    <div className="min-h-screen bg-[#060f1f] text-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-14">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Recruiting Command Center</p>

        {wrestlers.length ? (
          <>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {wrestlers.length === 1 ? `${names}'s profile is live` : `${names}'s profiles are live`}
            </h1>
            <p className="mt-2 text-base text-white/70">College coaches can find {wrestlers.length === 1 ? "it" : "them"} now. Here is where things stand.</p>
            <ul className="mt-6 space-y-3">
              {wrestlers.map((w) => (
                <li key={w.id} className={`${card} p-4`}>
                  {wrestlers.length > 1 ? <p className="mb-3 text-sm font-black">{w.firstName}</p> : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.04] p-4">
                      <p className="text-3xl font-black">{w.programsViewed}</p>
                      <p className="text-sm text-white/65">{w.programsViewed === 1 ? "College program viewed" : "College programs viewed"}</p>
                    </div>
                    <Link href={`/athletes/${w.id}${w.todoEdit ? `?edit=${w.todoEdit}` : ""}`} className="block rounded-xl bg-white/[0.04] p-4 hover:bg-white/[0.07]">
                      <p className="text-3xl font-black">{w.percent}%</p>
                      <p className="text-sm text-white/65">Profile complete</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                        <div className="h-full rounded-full bg-[#D3B574]" style={{ width: `${w.percent}%` }} />
                      </div>
                      {w.percent < 100 ? <p className="mt-2 text-xs font-bold text-[#D3B574]">Finish it →</p> : null}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">First, find your wrestler</h1>
            <p className="mt-2 text-base text-white/70">Your account has no wrestler linked yet. Find the profile and claim it. It&apos;s free.</p>
            <Link href="/create-profile" className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#D3B574] px-6 py-3 text-base font-black text-[#0A1628] hover:bg-[#e2c98d]">
              Find and claim your wrestler <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </>
        )}

        <section className={`${card} mt-8 p-5`} aria-labelledby="cc-adds">
          <h2 id="cc-adds" className="text-lg font-black">
            What the Command Center adds
          </h2>
          <ul className="mt-3 space-y-2">
            {ADDS.map((l) => (
              <li key={l} className="flex gap-2.5 text-[15px] text-white/85">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden /> {l}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="cc-plans">
          <h2 id="cc-plans" className="mb-4 text-center text-lg font-black">
            {wrestlers.length ? "Pick a plan" : "Then pick a plan"}
          </h2>
          <FamilyPlanPicker insiderOffered={upgrade.insiderOffered} />
        </section>
      </div>
    </div>
  )
}
