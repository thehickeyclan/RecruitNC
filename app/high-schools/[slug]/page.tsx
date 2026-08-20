import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { buildSchoolFacts, type SchoolFacts } from "@/lib/data-dawg-school-dossier"
import { schoolSlugToPhrase } from "@/lib/school-links"

export const revalidate = 3600

/**
 * Public wrestling record for one high school.
 *
 * Renders the same `buildSchoolFacts` payload Data Dawg answers from, so the page and the chat
 * can never disagree. The slug is resolved through the same fuzzy school matcher, which means a
 * name that works in chat works in the URL.
 */

type PageProps = { params: Promise<{ slug?: string }> }

async function loadSchool(slugParam: string | undefined): Promise<SchoolFacts | null> {
  const phrase = schoolSlugToPhrase(slugParam ?? "")
  if (phrase.length < 2) return null
  const { facts } = await buildSchoolFacts(phrase)
  return facts
}

/**
 * Reachable by link, never crawled — the same rule as /view-profile, and for the same reason.
 *
 * A school page is a roster of results belonging to named minors. Public-by-link is what makes
 * it useful when Data Dawg points someone at it or a parent shares it; being in Google is a
 * different thing, and would make a 15-year-old's name and school permanently searchable.
 *
 * Note this is stricter than /nchsaa/[year], which is indexable and carries the same names.
 * Worth settling one way for both — but the safe default is the one that can be loosened later.
 */
const NO_INDEX = { index: false, follow: false, nocache: true } as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const facts = await loadSchool(slug)
  if (!facts) return { title: "School not found | RecruitNC", robots: NO_INDEX }

  const { state_champions, dual_team_titles } = facts.counts
  const bits = [
    state_champions ? `${state_champions} individual state title${state_champions === 1 ? "" : "s"}` : null,
    dual_team_titles ? `${dual_team_titles} dual team title${dual_team_titles === 1 ? "" : "s"}` : null,
  ].filter(Boolean)

  return {
    title: `${facts.name} Wrestling | RecruitNC`,
    description: bits.length
      ? `${facts.name} wrestling record: ${bits.join(", ")}, plus NHSCA, Super32 and state placement history.`
      : `${facts.name} wrestling history on RecruitNC.`,
    robots: NO_INDEX,
  }
}

function placementLabel(place: number): string {
  if (place === 1) return "Champion"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  return `${place}th`
}

function nationalResultLabel(place: number | null): string {
  return place == null || place === 0 ? "Competed" : placementLabel(place)
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-rnc-line bg-rnc-surface px-4 py-3">
      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="rounded-xl border border-rnc-line bg-rnc-raised p-5">
      <h2 className="mb-4 flex items-baseline gap-2 text-lg font-bold text-white">
        {title}
        <span className="text-sm font-semibold tabular-nums text-rnc-gold">{count}</span>
      </h2>
      {children}
    </section>
  )
}

function Row({ year, children }: { year: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 border-b border-rnc-line/60 py-2 last:border-b-0">
      <span className="w-12 shrink-0 font-semibold tabular-nums text-rnc-gold">{year}</span>
      <span className="text-slate-200">{children}</span>
    </li>
  )
}

export default async function HighSchoolPage({ params }: PageProps) {
  const { slug } = await params
  const facts = await loadSchool(slug)
  if (!facts) notFound()

  const classificationLine = [
    facts.classification,
    facts.region ? `Region ${facts.region}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <main className="min-h-screen bg-rnc-ink px-6 py-12 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link href="/high-schools" className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">
            ← All high schools
          </Link>
          <h1 className="text-3xl font-bold sm:text-4xl">{facts.name}</h1>
          {classificationLine ? (
            <p className="text-slate-400">
              {classificationLine}
              {facts.classification_effective_year ? (
                <span className="text-slate-500"> (effective {facts.classification_effective_year})</span>
              ) : null}
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="State titles" value={facts.counts.state_champions} />
          <Stat label="Other state placements" value={facts.counts.state_placements} />
          <Stat label="Dual team titles" value={facts.counts.dual_team_titles} />
          <Stat label="NHSCA All-Americans" value={facts.counts.nhsca_all_americans} />
        </div>

        <Section title="Individual state titles" count={facts.counts.state_champions}>
          <ul>
            {facts.state_champions.map((c, i) => (
              <Row key={`${c.year}-${c.name}-${i}`} year={c.year}>
                <span className="font-semibold text-white">{c.name}</span>
                {c.classification || c.weight ? (
                  <span className="text-slate-400">
                    {" "}
                    — {[c.classification, c.weight].filter(Boolean).join(", ")}
                  </span>
                ) : null}
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="Dual team state championships" count={facts.counts.dual_team_titles}>
          <ul>
            {facts.dual_team_titles.map((d, i) => (
              <Row key={`${d.year}-${i}`} year={d.year}>
                State Dual Team Champion
                {d.division ? <span className="text-slate-400"> — {d.division}</span> : null}
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="NHSCA Nationals" count={facts.nhsca.length}>
          <ul>
            {facts.nhsca.map((r, i) => (
              <Row key={`${r.year}-${r.name}-${i}`} year={r.year}>
                <span className="font-semibold text-white">{r.name}</span>
                <span className="text-slate-400">
                  {" "}
                  — {nationalResultLabel(r.place)}
                  {r.place != null && r.place >= 1 && r.place <= 8 ? " (All-American)" : ""}
                  {[r.division, r.weight, r.record].filter(Boolean).length
                    ? ` (${[r.division, r.weight, r.record].filter(Boolean).join(", ")})`
                    : ""}
                </span>
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="Super32 All-Americans" count={facts.counts.super32_all_americans}>
          <ul>
            {facts.super32_all_americans.map((r, i) => (
              <Row key={`${r.year}-${r.name}-${i}`} year={r.year}>
                <span className="font-semibold text-white">{r.name}</span>
                <span className="text-slate-400">
                  {" "}
                  — {nationalResultLabel(r.place)}
                  {r.weight ? ` (${r.weight})` : ""}
                </span>
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="Dave Schultz High School Excellence Award" count={facts.counts.dave_schultz}>
          <ul>
            {facts.dave_schultz.map((d, i) => (
              <Row key={`${d.year}-${i}`} year={d.year}>
                <span className="font-semibold text-white">{d.name}</span>
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="Tricia Saunders High School Excellence Award" count={facts.counts.tricia_saunders}>
          <ul>
            {facts.tricia_saunders.map((d, i) => (
              <Row key={`${d.year}-${i}`} year={d.year}>
                <span className="font-semibold text-white">{d.name}</span>
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="State tournament Most Outstanding Wrestler" count={facts.counts.state_mow}>
          <ul>
            {facts.state_mow.map((m, i) => (
              <Row key={`${m.year}-${i}`} year={m.year}>
                <span className="font-semibold text-white">{m.name}</span>
                {m.division ? <span className="text-slate-400"> — {m.division}</span> : null}
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="Other state placements" count={facts.counts.state_placements}>
          <ul>
            {facts.state_placements.map((p, i) => (
              <Row key={`${p.year}-${p.name}-${i}`} year={p.year}>
                <span className="font-semibold text-white">{p.name}</span>
                <span className="text-slate-400">
                  {" "}
                  — {placementLabel(p.place ?? 0)}
                  {[p.classification, p.weight].filter(Boolean).length
                    ? ` (${[p.classification, p.weight].filter(Boolean).join(", ")})`
                    : ""}
                </span>
              </Row>
            ))}
          </ul>
        </Section>

        <Section title="State qualifiers" count={facts.counts.state_qualifiers}>
          <ul>
            {facts.state_qualifiers.map((q, i) => (
              <Row key={`${q.year}-${q.name}-${i}`} year={q.year}>
                <span className="font-semibold text-white">{q.name}</span>
                <span className="text-slate-400">
                  {" "}
                  — State qualifier
                  {[q.classification, q.weight].filter(Boolean).length
                    ? ` (${[q.classification, q.weight].filter(Boolean).join(", ")})`
                    : ""}
                </span>
              </Row>
            ))}
          </ul>
        </Section>

        {facts.counts.state_champions === 0 &&
        facts.counts.state_placements === 0 &&
        facts.counts.state_qualifiers === 0 ? (
          <p className="rounded-xl border border-rnc-line bg-rnc-raised p-5 text-slate-300">
            We don&apos;t have state tournament results on file for {facts.name} yet. If that looks
            wrong, tell Data Dawg — corrections go straight to our review queue.
          </p>
        ) : null}
      </div>
    </main>
  )
}
