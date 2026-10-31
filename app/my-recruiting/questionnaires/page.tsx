/**
 * Interest forms (22 Oct 2026, Matt: "fill it in, have the family review and submit; once
 * submitted the system knows, with a date and time stamp").
 *
 * Every college on the family's list that has a recruiting questionnaire, to do or done, with the
 * family's answers typed once underneath. The family opens each college's form, fills it from
 * here, checks it, and presses Submit on the college's own page - we never submit for them (the
 * forms carry reCAPTCHA, and a coach should read answers a parent looked at). "I submitted it"
 * stamps the college with the date and time.
 */
import { PortalShell } from "@/components/portal/portal-shell"
import { QuestionnairePack, type PackForm } from "@/components/portal/questionnaire-pack"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import data from "@/lib/college-programs/programs-2026-27.json"
import { loadAnswers } from "@/lib/questionnaire/answers"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadCommandCenter } from "../load"

export const dynamic = "force-dynamic"
export const metadata = { title: "Interest forms | Recruiting Command Center" }

const GOLD = "var(--recruit-accent)"
const SITES = new Map((data.schools as Array<{ id: string; website: string | null }>).map((s) => [s.id, s.website]))

export default async function QuestionnairesPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams
  const cc = await loadCommandCenter("/my-recruiting/questionnaires")
  const wrestler = cc.athletes.find((a) => a.id === w) ?? cc.athletes[0] ?? null
  const side = wrestler?.gender && /^f/i.test(wrestler.gender) ? "womens" : cc.focus?.gender === "womens" ? "womens" : "mens"

  // Every college on the list is a form to do. Without a link on file, the button goes to the
  // college's wrestling site to find it - and the family can still mark it submitted.
  const forms: PackForm[] = []
  for (const s of cc.schools) {
    if (s.noTeam) continue
    const url = questionnairesForSchool(s.id).map((q) => q[side]).find(Boolean) ?? null
    const site = SITES.get(s.id) ?? null
    forms.push({ schoolId: s.id, name: s.name, level: s.level, logo: s.logo, url: url ?? site ?? `/recruiting/schools/${s.id}`, onFile: Boolean(url), done: Boolean(s.questionnaireDone), doneAt: s.questionnaireDoneAt ?? null })
  }

  const answers = wrestler ? await loadAnswers(createAdminClient(), wrestler.id) : null
  const toDo = forms.filter((f) => !f.done).length

  return (
    <PortalShell active="forms">
      <div className="mx-auto max-w-7xl text-white">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          <div className="relative p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Interest forms</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              {toDo === 0 && forms.length > 0 ? "All forms done" : toDo === 1 ? "1 form to fill" : `${toDo} forms to fill`}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
              A college&apos;s interest form puts {wrestler?.firstName ?? "your wrestler"} in its recruiting database. Answer once below, then fill each form in a few minutes.
            </p>
            {cc.athletes.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {cc.athletes.map((a) => (
                  <a
                    key={a.id}
                    href={`/my-recruiting/questionnaires?w=${a.id}`}
                    aria-current={a.id === wrestler?.id ? "true" : undefined}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${a.id === wrestler?.id ? "border-[#D3B574] text-[#D3B574]" : "border-white/15 text-white/75 hover:text-white"}`}
                  >
                    {a.firstName}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {wrestler && answers ? (
          <QuestionnairePack
            athleteId={wrestler.id}
            firstName={wrestler.firstName}
            forms={forms}

            answers={answers}
            readOnly={cc.viewerId !== cc.authUserId}
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-8 text-center">
            <p className="text-lg font-bold">Link your wrestler first</p>
            <p className="mt-1 text-sm text-white/55">Forms are filled from your wrestler&apos;s profile.</p>
          </div>
        )}
      </div>
    </PortalShell>
  )
}
