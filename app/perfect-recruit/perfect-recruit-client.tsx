"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Pencil, Target } from "lucide-react"
import { PerfectRecruitWizard, StatusIcon, type SavedPerfectRecruit } from "@/app/compare/program-fit-panel"
import { FitBadge } from "@/components/fit-badge"
import { CoachTabs } from "@/components/coach-tabs"
import { EMPTY_CRITERIA, describePerfectRecruit, type FitKey, type FitStatus } from "@/lib/program-fit"

export type PerfectRecruitMatch = {
  id: string
  name: string
  highSchool: string | null
  classYear: number | null
  weight: string | null
  verdict: "meets" | "possible"
  summary: string
  met: number
  total: number
  checks: Array<{ key: FitKey; label: string; status: FitStatus; detail: string; mustHave: boolean }>
}

const GOLD = "text-[#D3B574]"
const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const TITLE = "flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40"

function AccessPanel({ signedOut }: { signedOut: boolean }) {
  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-16 text-white">
      <div className={`${PANEL} mx-auto max-w-xl border-[#D3B574]/30 p-6 text-center sm:p-8`}>
        <div className="mx-auto mb-4 inline-flex rounded-full bg-[#D3B574]/10 p-3">
          <Lock className={`h-6 w-6 ${GOLD}`} />
        </div>
        <h1 className="text-xl font-black">{signedOut ? "Sign in to set your perfect recruit" : "The perfect recruit is for college coaches"}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          Tell us what your program needs and every North Carolina wrestler is flagged against it. Free for verified college coaching staff.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {signedOut ? (
            <Link href="/auth/signin?returnTo=%2Fperfect-recruit" className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]">
              Sign in
            </Link>
          ) : null}
          <Link
            href="/auth/signup?type=college-coach&returnTo=%2Fperfect-recruit"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]"
          >
            College coach sign-up
          </Link>
        </div>
      </div>
    </main>
  )
}

function MatchRow({ m }: { m: PerfectRecruitMatch }) {
  return (
    <li className="border-t border-white/5 px-3 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Link href={`/athletes/${m.id}`} className="min-w-0 text-sm font-bold text-white hover:text-[#D3B574]">
          {m.name}
          <span className="ml-2 text-xs font-normal text-white/45">
            {[m.classYear ? `Class of ${m.classYear}` : null, m.weight ? `${m.weight} lbs` : null, m.highSchool].filter(Boolean).join(" · ")}
          </span>
        </Link>
        <span className="flex items-center gap-2">
          <FitBadge flag={m} />
          <Link href={`/compare?left=${m.id}&src=perfect-recruit`} className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-bold text-white/60 hover:border-[#D3B574] hover:text-[#D3B574]">
            Compare
          </Link>
        </span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {m.checks.map((c) => (
          <li key={c.key} className="flex items-center gap-1 text-[11px] text-white/50" title={c.detail}>
            <StatusIcon status={c.status} className="h-3 w-3" />
            <span>
              {c.label}: {c.detail}
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
}

export default function PerfectRecruitClient({
  access,
  saved = null,
  hasStandard = false,
  classYearOptions = [],
  matches = [],
  checked = 0,
  failed = false,
}: {
  access: "ok" | "signed-out" | "not-coach"
  saved?: SavedPerfectRecruit | null
  hasStandard?: boolean
  classYearOptions?: number[]
  matches?: PerfectRecruitMatch[]
  /** How many wrestlers were checked, so "12 meet it" has a denominator. */
  checked?: number
  failed?: boolean
}) {
  const router = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [show, setShow] = useState<"meets" | "possible">("meets")
  const meets = useMemo(() => matches.filter((m) => m.verdict === "meets"), [matches])
  const possible = useMemo(() => matches.filter((m) => m.verdict === "possible"), [matches])
  if (access !== "ok") return <AccessPanel signedOut={access === "signed-out"} />

  const criteria = saved?.criteria ?? EMPTY_CRITERIA
  const needs = describePerfectRecruit(criteria)
  const stamp = saved?.updatedAt
    ? `Last saved by ${saved.updatedByName ?? "a coach"} on ${new Date(saved.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : null
  const listed = show === "meets" ? meets : possible

  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <CoachTabs active="standard" className="mb-6" />
        <header>
          <p className={`text-[11px] font-black uppercase tracking-widest ${GOLD}`}>RecruitNC · For your program</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Your perfect recruit</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Set what your program needs once. Wrestlers are then flagged against it on this page, on your recruits board, on their
            profiles and in comparisons. Nobody is hidden: a flag tells you who meets it, who might, and what is missing.
          </p>
        </header>

        <section className={`${PANEL} mt-6 border-[#D3B574]/30 p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={TITLE}>
              <Target className={`h-3.5 w-3.5 ${GOLD}`} /> Your standard
            </h2>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]"
            >
              <Pencil className="h-3.5 w-3.5" /> {hasStandard ? "Edit" : "Set your perfect recruit"}
            </button>
          </div>
          {hasStandard ? (
            <>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {needs.map((d) => (
                  <span key={d} className="rounded-full bg-white/[0.06] px-3 py-1 text-sm font-semibold text-white/80">
                    {d}
                  </span>
                ))}
              </div>
              {stamp ? <p className="mt-3 text-xs text-white/40">{stamp}. Shared with your whole staff.</p> : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-white/60">
              Nothing set yet. It takes about a minute: the weights and classes you are recruiting, an academic floor, the level of competition
              you want, and which of those are must-haves.
            </p>
          )}
        </section>

        {hasStandard ? (
          <section className={`${PANEL} mt-4 p-4 sm:p-5`}>
            <h2 className={TITLE}>Who meets it</h2>
            {failed ? (
              <p className="mt-3 text-sm text-white/60">We could not check wrestlers against your standard just now. Reload the page to try again.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-white/60">
                  Checked {checked.toLocaleString()} North Carolina wrestlers in the current classes.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["meets", `Meets your standard (${meets.length})`],
                      ["possible", `Possible fit (${possible.length})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setShow(key)}
                      aria-pressed={show === key}
                      className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                        show === key ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/70 hover:border-[#D3B574]/60"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/40">
                  {show === "meets"
                    ? "Every need you set is met by what is on the profile."
                    : "Nothing is missed, but something you ask for is not on the profile yet, most often a GPA or test score."}
                </p>
                {listed.length ? (
                  <ul className="mt-3">
                    {listed.slice(0, 150).map((m) => (
                      <MatchRow key={m.id} m={m} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-white/55">
                    {show === "meets"
                      ? "No wrestler meets every need on file yet. Check the possible fits, or loosen a need."
                      : "No possible fits: every wrestler either meets your standard or misses a need."}
                  </p>
                )}
                {listed.length > 150 ? <p className="mt-3 text-xs text-white/40">Showing the first 150 of {listed.length}. Tighten a need to narrow it.</p> : null}
              </>
            )}
          </section>
        ) : null}
      </div>

      {wizardOpen ? (
        <PerfectRecruitWizard
          initial={criteria}
          classYearOptions={classYearOptions}
          onClose={() => setWizardOpen(false)}
          onSaved={() => {
            setWizardOpen(false)
            // The matches are worked out on the server from what was just saved.
            router.refresh()
          }}
        />
      ) : null}
    </main>
  )
}
