import type { Metadata } from "next"
import Image from "next/image"

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import { CADEN_PERRY_HUB_CARD_IMAGE_SRC } from "@/lib/scholarships/caden-perry-gallery-images"
import { scholarshipApplicationBadge } from "@/lib/scholarships/applications-open"
import {
  SHARED_SCHOLARSHIP_VOTING_COMMITTEE,
  SCHOLARSHIP_BLIND_REVIEW_SUMMARY,
  SCHOLARSHIP_HUB_ADVISORY_EXPLAINER,
  SCHOLARSHIP_HUB_COMMITTEE_INTRO,
  SCHOLARSHIP_HUB_TRANSPARENCY_NOTE,
  SCHOLARSHIP_INTEGRITY_NOTE,
} from "@/lib/scholarships/scholarship-hub-governance"
import { listPublicAwardsAll, listScholarshipsForHub } from "@/lib/scholarships/public-queries"
import { HardLink } from "@/components/hard-link"

export const metadata: Metadata = {
  title: "Scholarships | NC United Wrestling",
  description:
    "NC United scholarships honor character and legacies in wrestling. Named funds provide training support stipends—apply, give, and read each fund’s story.",
}

function df(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export default async function ScholarshipsHubPage() {
  const [scholarships, awards] = await Promise.all([listScholarshipsForHub(), listPublicAwardsAll()])

  return (
    <div
      className="min-h-screen bg-[#061224] text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <header className="relative overflow-hidden border-b border-white/[0.06] px-4 pb-14 pt-12 sm:pb-16 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 22%, #C8A94A 0%, transparent 42%), radial-gradient(circle at 82% 78%, #CC0000 0%, transparent 38%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <p className={df("text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#CC0000]")}>NC United Wrestling</p>
          <h1
            className={df(
              "mt-4 max-w-3xl mx-auto text-[clamp(1.65rem,4.2vw,2.35rem)] font-black tracking-tight leading-[1.12] text-white",
            )}
          >
            Scholarships rooted in character—on the mat and long after
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/72">
            NC United scholarships recognize what wrestling asks of a person: discipline when it&apos;s hard, respect when no
            one&apos;s watching, and courage when the match is on the line. Many funds{" "}
            <strong className="font-semibold text-white/85">honor legacies</strong>—athletes, coaches, and families whose
            example still defines what we want this sport to build.{" "}
            <strong className="font-semibold text-white/85">Named funds</strong> turn donations into{" "}
            <strong className="font-semibold text-white/85">training support stipends</strong> for wrestling-related expenses,
            so families aren&apos;t choosing between bills and the next step in their athlete&apos;s journey.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
            These stipends are not college tuition, academic prizes, or NCAA athletic scholarships; every fund&apos;s page
            spells out the story and the numbers.
          </p>
          <HardLink
            href="/fundraising"
            className="mt-10 inline-flex text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            ← Fundraising hub
          </HardLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <section id="scholarship-funds" aria-labelledby="active-scholarships-heading">
          <h2 id="active-scholarships-heading" className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>
            Scholarship funds
          </h2>
          {scholarships.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Scholarships aren&apos;t configured yet — staff can enable them after running{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] text-[#C8A94A]">
                scripts/supabase-scholarships-portal.sql
              </code>{" "}
              in Supabase.
            </p>
          ) : (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {scholarships.map((s) => {
                const badge = scholarshipApplicationBadge(s)
                const badgeLabel =
                  badge === "open" ? "Applications open" : badge === "coming_soon" ? "Coming soon" : "Applications closed"
                const badgeClass =
                  badge === "open"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                    : badge === "coming_soon"
                      ? "border-[#C8A94A]/45 bg-[#C8A94A]/12 text-[#f5e6b8]"
                      : "border-white/15 bg-white/5 text-white/65"

                const hero = (s.hero_image_url ?? "").trim()
                const tileSrc =
                  hero ||
                  (s.slug.trim().toLowerCase() === "caden-perry" ? CADEN_PERRY_HUB_CARD_IMAGE_SRC : "")

                return (
                  <li
                    key={s.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-[#C8A94A]/25 bg-[#0B2545]/55 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.65)]"
                  >
                    <div className="relative aspect-[16/9] w-full bg-[#061224]">
                      {tileSrc ? (
                        tileSrc.startsWith("/") ? (
                          <Image
                            src={tileSrc}
                            alt=""
                            fill
                            className="object-cover object-[center_35%]"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- remote CMS/storage URLs
                          <img src={tileSrc} alt="" className="h-full w-full object-cover object-center" />
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                          Scholarship fund
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      <h3 className={df("mt-3 text-lg font-black uppercase leading-snug tracking-tight text-white")}>{s.name}</h3>
                      {s.tagline ? <p className="mt-2 text-sm italic leading-relaxed text-[#C8A94A]/95">&ldquo;{s.tagline}&rdquo;</p> : null}
                      <p className="mt-4 text-sm text-white/70">
                        Scholarship fund:{" "}
                        <span className="tabular-nums font-semibold text-white">{formatUsdWhole(s.total_donated_cents)}</span>
                        {s.award_amount_cents ? (
                          <>
                            {" "}
                            · Award amount:{" "}
                            <span className="tabular-nums font-semibold text-white">{formatUsdWhole(s.award_amount_cents)}</span>
                          </>
                        ) : null}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <HardLink
                          href={`/fundraising/scholarships/${s.slug}`}
                          className={df(
                            "inline-flex min-h-[44px] items-center rounded-sm border border-[#C8A94A]/55 px-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] hover:bg-[#C8A94A]/12",
                          )}
                        >
                          Learn more →
                        </HardLink>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section
          id="selection-committee"
          className="mt-16 border-t border-white/[0.06] pt-14"
          aria-labelledby="selection-committee-heading"
        >
          <h2 id="selection-committee-heading" className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>
            Selection committee & governance
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/72">{SCHOLARSHIP_HUB_COMMITTEE_INTRO}</p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">{SCHOLARSHIP_HUB_ADVISORY_EXPLAINER}</p>

          <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 bg-black/20 text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]/95">
                  <th className="px-4 py-3 pr-3">Name</th>
                  <th className="px-3 py-3">Seat</th>
                  <th className="px-3 py-3">Connection</th>
                  <th className="px-4 py-3 pl-3">Vote</th>
                </tr>
              </thead>
              <tbody className="text-white/78">
                {SHARED_SCHOLARSHIP_VOTING_COMMITTEE.map((row) => (
                  <tr key={row.name} className="border-b border-white/[0.06]">
                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                    <td className="px-3 py-3">{row.seatTitle}</td>
                    <td className="px-3 py-3 text-white/65">{row.connection}</td>
                    <td className="px-4 py-3 text-white/75">{row.voteType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-white/45">{SCHOLARSHIP_HUB_TRANSPARENCY_NOTE}</p>

          <div className="mt-10 rounded-xl border border-white/[0.07] bg-[#0B2545]/35 px-4 py-6 sm:px-6">
            <h3 className={df("text-[11px] font-bold uppercase tracking-[0.18em] text-[#C8A94A]")}>Blind review & integrity</h3>
            <p className="mt-4 text-sm leading-relaxed text-white/72">{SCHOLARSHIP_BLIND_REVIEW_SUMMARY}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/58">{SCHOLARSHIP_INTEGRITY_NOTE}</p>
          </div>
        </section>

        <section className="mt-16 border-t border-white/[0.06] pt-14" aria-labelledby="past-awards-heading">
          <h2 id="past-awards-heading" className={df("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}>
            Public award wall
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Recipients whose families opted into public recognition appear here as awards are recorded.
          </p>
          {awards.length === 0 ? (
            <p className="mt-6 text-sm text-white/45">No public awards yet — inaugural recipients will appear here after announcements.</p>
          ) : (
            <ul className="mt-8 space-y-4">
              {awards.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/10 bg-[#0B2545]/40 px-4 py-4">
                  <p className="text-sm font-semibold text-white">
                    {a.recipient_name ?? "Recipient"}
                    {a.recipient_school ? (
                      <span className="font-normal text-white/65">
                        {" "}
                        · {a.recipient_school}
                        {a.award_year ? ` · ${a.award_year}` : ""}
                      </span>
                    ) : a.award_year ? (
                      <span className="font-normal text-white/65"> · {a.award_year}</span>
                    ) : null}
                  </p>
                  {a.scholarship_name ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#C8A94A]/85">{a.scholarship_name}</p>
                  ) : null}
                  {a.public_citation ? <p className="mt-2 text-sm leading-relaxed text-white/70">{a.public_citation}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-16 rounded-2xl border border-[#CC0000]/35 bg-[#CC0000]/10 px-5 py-8 text-center sm:px-8">
          <p className={df("text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]")}>Give</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/78">
            Contributions toward a named scholarship are charitable gifts to NC United Wrestling — our North Carolina 501(c)(3) —
            administered consistent with NC United policies for that fund. Whether your contribution is deductible is between you
            and your tax advisor.
          </p>
          <HardLink
            href="/fundraising/scholarships#scholarship-funds"
            className={`${df(
              "mt-6 inline-flex min-h-[48px] items-center justify-center rounded-sm bg-[#CC0000] px-8 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[#a80000]",
            )}`}
          >
            Browse scholarship funds
          </HardLink>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-10 text-center text-[11px] text-white/45">
        NC United Wrestling is a registered 501(c)(3) nonprofit · EIN 99-3757238
      </footer>
    </div>
  )
}
