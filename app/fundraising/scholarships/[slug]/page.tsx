import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import { HardLink } from "@/components/hard-link"
import {
  CADEN_ABOUT_COMING_SOON_LINE,
  CADEN_ABOUT_PLACEHOLDER_BODY,
  CADEN_APPLICATION_ESSAY_SUMMARY,
  CADEN_AWARD_DESCRIPTION_VERBATIM,
  CADEN_CLOSING_TAGLINE_FULLWIDTH,
  CADEN_ELIGIBILITY_BODY,
  CADEN_FAMILY_ADVISORY_MEMBER,
  CADEN_NOMINATORS_BODY,
  CADEN_PUBLIC_PAGE_FALLBACKS,
  CADEN_REVIEW_PROCESS_STAGES,
  CADEN_SELECTION_CRITERIA_CARDS,
  CADEN_SELECTION_FOOTNOTE,
} from "@/lib/scholarships/caden-perry-content"
import {
  scholarshipApplicationBadge,
  scholarshipApplicationsAreOpen,
} from "@/lib/scholarships/applications-open"
import { getScholarshipBySlug, listPublicAwardsForScholarship } from "@/lib/scholarships/public-queries"

function df(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

function formatScholarshipPageDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getScholarshipBySlug(slug)
  if (!row) return { title: "Scholarship | NC United" }
  return {
    title: `${row.name} | NC United Scholarships`,
    description: row.tagline ?? `${row.name} — NC United Wrestling scholarships.`,
  }
}

export default async function ScholarshipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  const awards = await listPublicAwardsForScholarship(s.id)
  const badge = scholarshipApplicationBadge(s)
  const badgeLabel =
    badge === "open" ? "Applications open" : badge === "coming_soon" ? "Coming soon" : "Applications closed"
  const appsOpen = scholarshipApplicationsAreOpen(s)
  const isCaden = s.slug === "caden-perry"

  const openDisplayRaw =
    isCaden && !s.applications_open_date ? CADEN_PUBLIC_PAGE_FALLBACKS.applications_open_date : s.applications_open_date
  const closeDisplayRaw =
    isCaden && !s.applications_close_date ? CADEN_PUBLIC_PAGE_FALLBACKS.applications_close_date : s.applications_close_date
  const announceDisplayRaw =
    isCaden && !s.award_announcement_date
      ? CADEN_PUBLIC_PAGE_FALLBACKS.award_announcement_date
      : s.award_announcement_date

  const closePretty = formatScholarshipPageDate(closeDisplayRaw ?? null)
  const announcePretty = formatScholarshipPageDate(announceDisplayRaw ?? null)

  const awardAmountDisplayCents =
    isCaden && s.award_amount_cents == null ? CADEN_PUBLIC_PAGE_FALLBACKS.award_amount_cents : s.award_amount_cents

  const awardParagraphs = CADEN_AWARD_DESCRIPTION_VERBATIM.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

  return (
    <div
      className="min-h-screen bg-[#061224] text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <section className="relative">
        <div className="relative aspect-[21/9] max-h-[420px] w-full bg-[#0B2545]">
          {s.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.hero_image_url} alt="" className="h-full w-full object-cover object-[center_22%]" />
          ) : (
            <div className="relative flex h-full min-h-[220px] flex-col items-center justify-center bg-gradient-to-br from-[#0B2545] via-[#061224] to-black px-6 py-10">
              <Image
                src="/images/nc-united-stacked-logo-white.png"
                alt="NC United Wrestling"
                width={470}
                height={394}
                className="h-auto max-h-[min(38vw,220px)] w-auto opacity-[0.38]"
                priority
              />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061224] via-[#061224]/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-10 pt-24 sm:px-8">
            <div className="mx-auto max-w-4xl">
              <p className={df("text-[9px] font-bold uppercase tracking-[0.28em] text-white/55")}>NC United Wrestling</p>
              <p className={df("mt-2 text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#CC0000]")}>Scholarships</p>
              <h1 className={df("mt-4 text-[clamp(1.65rem,4.6vw,2.85rem)] font-black uppercase leading-[1.08] tracking-tight text-white")}>
                {s.name}
              </h1>
              {s.tagline ? (
                <p className="mt-5 max-w-2xl text-lg italic leading-relaxed text-[#C8A94A]/95">&ldquo;{s.tagline}&rdquo;</p>
              ) : null}
              {s.established_year ? (
                <p
                  className={df(
                    "mt-6 inline-flex rounded-full border border-[#C8A94A]/55 bg-[#C8A94A]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f5e6b8]",
                  )}
                >
                  Established {s.established_year}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <HardLink href="/fundraising/scholarships" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          ← Scholarships hub
        </HardLink>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              badge === "open"
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : badge === "coming_soon"
                  ? "border-[#C8A94A]/45 bg-[#C8A94A]/12 text-[#f5e6b8]"
                  : "border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {badgeLabel}
          </span>
          {openDisplayRaw || closeDisplayRaw ? (
            <span className="text-[11px] text-white/45">
              {openDisplayRaw ? (
                <>
                  Opens <span className="tabular-nums text-white/65">{openDisplayRaw}</span>
                </>
              ) : null}
              {openDisplayRaw && closeDisplayRaw ? <> · </> : null}
              {closeDisplayRaw ? (
                <>
                  closes <span className="tabular-nums text-white/65">{closeDisplayRaw}</span>
                </>
              ) : null}
            </span>
          ) : null}
        </div>

        {isCaden ? (
          <>
            {/* Full story pending Perry family approval — Matt confirms before publishing substantive edits */}
            <section className="mt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>About Caden</h2>
              <div className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-white/78">{CADEN_ABOUT_PLACEHOLDER_BODY}</div>
              <p className="mt-6 text-sm italic leading-relaxed text-white/55">{CADEN_ABOUT_COMING_SOON_LINE}</p>
            </section>

            <section className="mt-16 border-t border-white/[0.06] pt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>The award</h2>
              <div className="mt-6 space-y-5 text-[15px] leading-[1.75] text-white/82">
                {awardParagraphs.map((para, i) => (
                  <p key={i} className="text-pretty">
                    {para}
                  </p>
                ))}
              </div>
            </section>

            <p
              className={`${df(
                "mx-auto mt-16 max-w-3xl text-center text-[clamp(1.2rem,3.8vw,1.85rem)] font-black uppercase leading-snug tracking-[0.06em] text-[#C8A94A]",
              )}`}
            >
              {CADEN_CLOSING_TAGLINE_FULLWIDTH}
            </p>

            <section className="mt-16 border-t border-white/[0.06] pt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>What we look for</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {CADEN_SELECTION_CRITERIA_CARDS.map((c) => (
                  <article key={c.title} className="rounded-xl border border-white/[0.07] bg-[#0B2545]/35 px-4 py-5">
                    <p className={df("text-[11px] font-black uppercase tracking-[0.14em] text-white")}>
                      {c.title}{" "}
                      <span className="text-[#C8A94A]">({c.weightLabel})</span>
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-white/72">{c.body}</p>
                  </article>
                ))}
              </div>
              <p className="mt-8 text-xs leading-relaxed text-white/42">{CADEN_SELECTION_FOOTNOTE}</p>
            </section>

            <section className="mt-16 border-t border-white/[0.06] pt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Eligibility & nominations</h2>
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className={df("text-[11px] font-bold uppercase tracking-[0.14em] text-white/80")}>Who can be nominated</h3>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/72">{CADEN_ELIGIBILITY_BODY}</div>
                </div>
                <div>
                  <h3 className={df("text-[11px] font-bold uppercase tracking-[0.14em] text-white/80")}>Who can nominate</h3>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/72">{CADEN_NOMINATORS_BODY}</div>
                </div>
              </div>
            </section>

            <section className="mt-16 border-t border-white/[0.06] pt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>The application</h2>
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-white/72">{CADEN_APPLICATION_ESSAY_SUMMARY}</div>
            </section>

            <section className="mt-16 border-t border-white/[0.06] pt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>How we review</h2>
              <ol className="mt-6 space-y-5">
                {CADEN_REVIEW_PROCESS_STAGES.map((stage, i) => (
                  <li key={stage.title} className="flex gap-4">
                    <span className={df("mt-0.5 shrink-0 tabular-nums text-xs font-black text-[#C8A94A]")}>{i + 1}</span>
                    <div>
                      <p className={df("text-sm font-bold uppercase tracking-wide text-white/88")}>{stage.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/68">{stage.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-16 border-t border-white/[0.06] pt-14">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Family advisory — this scholarship</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/68">
                The voting committee that scores nominations blind is the same across NC United scholarship funds — see the{" "}
                <HardLink href="/fundraising/scholarships#selection-committee" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
                  Scholarships hub
                </HardLink>
                . This award separately names one non-voting family representative tied only to the Caden Perry Scholarship:
              </p>
              <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/15 bg-black/20 text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]/95">
                      <th className="px-4 py-3 pr-3">Name</th>
                      <th className="px-3 py-3">Seat</th>
                      <th className="px-3 py-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/78">
                    <tr className="border-b border-white/[0.06]">
                      <td className="px-4 py-3 font-medium text-white">{CADEN_FAMILY_ADVISORY_MEMBER.name}</td>
                      <td className="px-3 py-3">{CADEN_FAMILY_ADVISORY_MEMBER.seatTitle}</td>
                      <td className="px-3 py-3 text-white/65">{CADEN_FAMILY_ADVISORY_MEMBER.connection}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <>
            {s.description ? (
              <div className="prose prose-invert prose-sm mt-10 max-w-none">
                <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Story</h2>
                <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-white/78">{s.description}</div>
              </div>
            ) : null}

            <div className="mt-12">
              <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Criteria</h2>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/72">
                {s.criteria ??
                  `Reviewers look for resilience in the face of adversity — on or off the mat; character that reflects what wrestling builds; perseverance through hardship; and a mindset that carries beyond the sport. Academic record and win-loss record are not selection criteria.`}
              </div>
            </div>

            {s.tagline ? (
              <p
                className={`${df(
                  "mx-auto mt-14 max-w-3xl text-center text-[clamp(1.05rem,3vw,1.45rem)] font-black uppercase leading-snug tracking-[0.04em] text-[#C8A94A]",
                )}`}
              >
                {s.tagline}
              </p>
            ) : null}
          </>
        )}

        {!isCaden ? (
          <p className="mt-12 text-center text-sm text-white/50">
            <HardLink
              href="/fundraising/scholarships#selection-committee"
              className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
            >
              Selection committee & how we review applications →
            </HardLink>
          </p>
        ) : null}

        <section className="mt-14 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/45 px-4 py-6 sm:px-6">
          <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>{isCaden ? "Fund status" : "Program summary"}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Total donated</p>
              <p className="mt-2 tabular-nums text-xl font-black text-white">{formatUsdWhole(s.total_donated_cents)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Award amount</p>
              <p className="mt-2 tabular-nums text-xl font-black text-white">
                {awardAmountDisplayCents != null ? formatUsdWhole(awardAmountDisplayCents) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Applications close</p>
              <p className="mt-2 text-sm font-semibold text-white/85">{closePretty ?? s.applications_close_date ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Award announcement</p>
              <p className="mt-2 text-sm font-semibold text-white/85">{announcePretty ?? s.award_announcement_date ?? "—"}</p>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {appsOpen ? (
            <HardLink
              href={`/fundraising/scholarships/${s.slug}/apply`}
              className={df(
                "flex min-h-[52px] items-center justify-center rounded-sm bg-[#CC0000] px-6 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[#a80000]",
              )}
            >
              Apply now →
            </HardLink>
          ) : (
            <div
              className={df(
                "flex min-h-[52px] items-center justify-center rounded-sm border border-white/18 px-6 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-white/55",
              )}
            >
              {badge === "coming_soon" ? "Applications opening soon" : "Applications closed"}
            </div>
          )}
          <HardLink
            href={`/fundraising/scholarships/${s.slug}/donate`}
            className={df(
              "flex min-h-[52px] items-center justify-center rounded-sm border border-[#C8A94A]/55 bg-[#C8A94A]/12 px-6 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-[#f5e6b8] hover:bg-[#C8A94A]/20",
            )}
          >
            Donate to this fund →
          </HardLink>
        </div>

        <section className="mt-16 border-t border-white/[0.06] pt-14">
          <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Award history</h2>
          {awards.length === 0 ? (
            <p className="mt-5 text-sm leading-relaxed text-white/55">
              {isCaden ? (
                <>
                  Year 1: Inaugural award to be announced{announcePretty ? ` (${announcePretty})` : " June 2026"}.
                </>
              ) : (
                <>
                  Inaugural award to be announced{s.award_announcement_date ? ` (${s.award_announcement_date})` : ""}.
                </>
              )}
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-[11px] font-bold uppercase tracking-wide text-[#C8A94A]/85">
                    <th className="py-3 pr-4">Year</th>
                    <th className="py-3 pr-4">Recipient</th>
                    <th className="py-3 pr-4">School</th>
                    <th className="py-3">Citation</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.06] text-white/75">
                      <td className="py-3 pr-4 tabular-nums text-white/90">{a.award_year ?? "—"}</td>
                      <td className="py-3 pr-4 font-medium text-white">{a.recipient_name ?? "—"}</td>
                      <td className="py-3 pr-4">{a.recipient_school ?? "—"}</td>
                      <td className="py-3">{a.public_citation ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-14 text-center text-[11px] leading-relaxed text-white/40">
          Questions or corrections?{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            info@ncwrestlingunited.com
          </a>
          .
        </p>
      </div>

      <footer className="border-t border-white/[0.06] px-4 py-10 text-center text-[11px] leading-relaxed text-white/45">
        <p>NC United Wrestling · 501(c)(3) · EIN 99-3757238</p>
        <p className="mt-2">
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
      </footer>
    </div>
  )
}
