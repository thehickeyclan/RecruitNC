import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import {
  scholarshipApplicationBadge,
  scholarshipApplicationsAreOpen,
} from "@/lib/scholarships/applications-open"
import { getScholarshipBySlug, listPublicAwardsForScholarship } from "@/lib/scholarships/public-queries"
import { HardLink } from "@/components/hard-link"

function df(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
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

/** Cadence PRD: standalone closing line — editable later via CMS/copy deck if needed. */
const CADEN_TAGLINE_FULLWIDTH = "The future is bright for those who refuse to quit."

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
            <div className="flex h-full min-h-[220px] items-center justify-center bg-gradient-to-br from-[#0B2545] via-[#061224] to-black">
              <p className={df("max-w-md px-6 text-center text-xs font-bold uppercase tracking-[0.24em] text-white/35")}>
                Hero photography pending family approval
              </p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061224] via-[#061224]/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-10 pt-24 sm:px-8">
            <div className="mx-auto max-w-4xl">
              <p className={df("text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#CC0000]")}>NC United Scholarships</p>
              <h1 className={df("mt-4 text-[clamp(1.65rem,4.6vw,2.85rem)] font-black uppercase leading-[1.08] tracking-tight text-white")}>
                {s.name}
              </h1>
              {s.tagline ? (
                <p className="mt-5 max-w-2xl text-lg italic leading-relaxed text-[#C8A94A]/95">&ldquo;{s.tagline}&rdquo;</p>
              ) : null}
              {s.established_year ? (
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
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
          {s.applications_open_date ? (
            <span className="text-[11px] text-white/45">
              Opens <span className="tabular-nums text-white/65">{s.applications_open_date}</span>
              {s.applications_close_date ? (
                <>
                  {" "}
                  · closes <span className="tabular-nums text-white/65">{s.applications_close_date}</span>
                </>
              ) : null}
            </span>
          ) : null}
        </div>

        {s.description ? (
          <div className="prose prose-invert prose-sm mt-10 max-w-none">
            <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Story</h2>
            <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-white/78">{s.description}</div>
          </div>
        ) : null}

        {isCaden ? (
          <div className="mt-12 border-y border-[#C8A94A]/25 py-10">
            <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>The award</h2>
            <blockquote className="mt-5 border-l-4 border-[#C8A94A]/55 pl-5 text-base italic leading-relaxed text-white/85">
              This scholarship is awarded to a student-athlete who embodies the true spirit of scholastic wrestling — someone who has faced adversity head-on and refused to be defined by it…
            </blockquote>
            <p className="sr-only">Full citation finalized with the Perry family.</p>
          </div>
        ) : null}

        <div className="mt-12">
          <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Criteria</h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/72">
            {s.criteria ??
              `Reviewers look for resilience in the face of adversity — on or off the mat; character that reflects what wrestling builds; perseverance through hardship; and a mindset that carries beyond the sport. Academic record and win-loss record are not selection criteria.`}
          </div>
        </div>

        {isCaden ? (
          <p
            className={`${df(
              "mx-auto mt-14 max-w-3xl text-center text-[clamp(1.15rem,3.4vw,1.65rem)] font-black uppercase leading-snug tracking-[0.04em] text-[#C8A94A]",
            )}`}
          >
            {CADEN_TAGLINE_FULLWIDTH}
          </p>
        ) : null}

        <section className="mt-14 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/45 px-4 py-6 sm:px-6">
          <h2 className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>Fund status</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Raised</p>
              <p className="mt-2 tabular-nums text-xl font-black text-white">{formatUsdWhole(s.total_donated_cents)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Award amount</p>
              <p className="mt-2 tabular-nums text-xl font-black text-white">
                {s.award_amount_cents != null ? formatUsdWhole(s.award_amount_cents) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Announcement</p>
              <p className="mt-2 text-sm font-semibold text-white/85">
                {s.award_announcement_date ?? "To be scheduled"}
              </p>
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
              Inaugural award to be announced{s.award_announcement_date ? ` (${s.award_announcement_date})` : ""}.
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
          .           Staff review portal:{" "}
          <HardLink href="/scholarships/review" className="text-[#C8A94A] hover:underline">
            /scholarships/review
          </HardLink>
          .
        </p>
      </div>

      <footer className="border-t border-white/[0.06] px-4 py-10 text-center text-[11px] text-white/45">
        NC United Wrestling · EIN 99-3757238
      </footer>
    </div>
  )
}
