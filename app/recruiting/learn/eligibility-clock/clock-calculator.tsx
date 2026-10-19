"use client"

import { useMemo, useState } from "react"
import { Lock } from "lucide-react"

import { AFTER_HIGH_SCHOOL, eligibilityClock, isSummerBirthday, type AfterHighSchool } from "@/lib/recruiting/learn/eligibility-clock"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const GOLD = "#D3B574"
const select = "w-full rounded-lg border border-white/15 bg-[#0A1628] px-3 py-2.5 text-sm text-white focus:border-[#D3B574] focus:outline-none"

/** The Division I eligibility clock for one wrestler. Nothing typed here leaves the browser. */
export function ClockCalculator({ firstName, defaultClass, classes }: { firstName: string | null; defaultClass: number; classes: number[] }) {
  const [classYear, setClassYear] = useState(defaultClass)
  const [birthYear, setBirthYear] = useState(defaultClass - 18)
  const [birthMonth, setBirthMonth] = useState(3)
  const [plan, setPlan] = useState<AfterHighSchool>("college")
  const r = useMemo(() => eligibilityClock({ birthYear, birthMonth, classYear, plan }), [birthYear, birthMonth, classYear, plan])
  const who = firstName ?? "your wrestler"
  const fewest = r.seasons[0]
  const most = r.seasons[r.seasons.length - 1]
  const start = r.starts[0]
  const years = Array.from({ length: 5 }, (_, i) => start + i)
  const birthYears = Array.from({ length: 12 }, (_, i) => classYear - 21 + i)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5">
        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>About {who}</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-white/60">
            Class of
            <select className={`${select} mt-1`} value={classYear} onChange={(e) => setClassYear(Number(e.target.value))}>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-white/60">
              Birth month
              <select className={`${select} mt-1`} value={birthMonth} onChange={(e) => setBirthMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-white/60">
              Birth year
              <select className={`${select} mt-1`} value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))}>
                {birthYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-white/60">
            After high school
            <select className={`${select} mt-1`} value={plan} onChange={(e) => setPlan(e.target.value as AfterHighSchool)}>
              {(Object.keys(AFTER_HIGH_SCHOOL) as AfterHighSchool[]).map((k) => (
                <option key={k} value={k}>{AFTER_HIGH_SCHOOL[k]}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-white/45">
          <Lock className="h-3 w-3" aria-hidden /> Nothing you enter here is saved or sent anywhere.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5">
        {r.model === "old" ? (
          <p className="text-sm leading-6 text-white/80">
            A wrestler who first enrolled in college before fall 2026 stays on the old rules: four seasons of competition within five years. Ask the college&apos;s compliance office.
          </p>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">Seasons at a Division I college</p>
            <p className="mt-1 text-6xl font-black tracking-tight">
              {fewest === most ? fewest : `${fewest}–${most}`}
              <span className="ml-2 text-xl font-semibold text-white/45">of 5</span>
            </p>
            <p className="mt-2 text-sm text-white/75">
              The clock starts in <b>fall {start}</b>
              {r.starts.length > 1 ? ` or fall ${r.starts[1]}` : ""} and runs five years, through spring {start + 5}
              {r.starts.length > 1 ? ` or ${r.starts[1] + 5}` : ""}.
            </p>

            {/* The five years, coloured by where they are spent. */}
            <div className="mt-5 grid grid-cols-5 gap-1.5">
              {years.map((y) => {
                const atD1 = y >= r.d1Fall
                const atJuco = !atD1 && y >= r.collegeFall
                return (
                  <div key={y} className={`rounded-lg border px-1 py-2 text-center ${atD1 ? "border-[#D3B574]/60 bg-[#D3B574]/15" : "border-white/10 bg-white/[0.04]"}`}>
                    <p className="text-[11px] font-bold text-white/80">
                      <span className="sm:hidden">{String(y).slice(2)}–{String(y + 1).slice(2)}</span>
                      <span className="hidden sm:inline">{y}–{String(y + 1).slice(2)}</span>
                    </p>
                    <p className={`mt-0.5 text-[10px] font-semibold ${atD1 ? "text-[#D3B574]" : "text-white/45"}`}>
                      <span className="sm:hidden">{atD1 ? "D1" : atJuco ? "JUCO" : "Clock"}</span>
                      <span className="hidden sm:inline">{atD1 ? "Division I" : atJuco ? "Junior college" : "Clock running"}</span>
                    </p>
                  </div>
                )
              })}
            </div>

            <ul className="mt-5 space-y-2 text-sm leading-6 text-white/75">
              <li>
                <b className="text-white">Why fall {start}:</b>{" "}
                {r.collegeFall <= r.ageFalls[0]
                  ? `that is when ${who} first enrolls full time in college${plan.startsWith("juco") ? ", at the junior college" : ""}, before the age trigger.`
                  : `the academic year after ${who}'s 19th birthday comes before college enrollment, so the clock starts without them.`}
              </li>
              {r.model === "better-of" ? <li><b className="text-white">Fall 2026 freshmen</b> get whichever is better: the old rules or this one.</li> : null}
              {isSummerBirthday(birthMonth) && r.seasons.length > 1 ? (
                <li className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">
                  A {MONTHS[birthMonth - 1]} birthday sits close to the start of the academic year, and the NCAA has not published the exact cutoff. Confirm with the college&apos;s compliance office which fall it is.
                </li>
              ) : null}
              {fewest < 5 ? <li><b className="text-white">To keep all five,</b> enroll full time in college no later than the fall after the 19th birthday.</li> : null}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
