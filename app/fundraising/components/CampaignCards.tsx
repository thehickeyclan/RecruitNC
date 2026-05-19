import Image from "next/image"
import type { FundraisingHubCampaignCard } from "@/lib/fundraising/hub-data"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "./FundraisingHero"

const NAVY = "#0B2545"
const GOLD = "#C8A94A"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

function daysRemaining(iso: string | null): number | null {
  if (!iso) return null
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / 86400000)
}

export function CampaignCards({ campaigns }: { campaigns: FundraisingHubCampaignCard[] }) {
  return (
    <section
      id="fundraising-active-campaigns"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#0B2545] px-4 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A] sm:text-[11px]")}`}>
            Live campaigns
          </p>
          <h2
            className={`${displayFont("mt-3 text-[clamp(1.85rem,4.5vw,2.65rem)] font-black uppercase tracking-tight text-white")}`}
          >
            Active campaigns
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white">
            What&apos;s live right now — open a drive, track the bar, and get teammates on the board.
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="mx-auto mt-14 max-w-lg overflow-hidden rounded-xl border border-white/12 bg-[#0B2545]/80 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.85)]">
            <div className="border-b border-[#CC0000]/40 bg-[#CC0000]/12 px-6 py-4">
              <h3 className={`${displayFont("text-lg font-black uppercase tracking-wide text-white")}`}>
                Support an Athlete Year-Round
              </h3>
            </div>
            <div className="px-6 py-8">
              <p className="leading-relaxed text-white">
                No timed drives are live on the board right now — NC United nonprofit checkout stays open year-round so you can
                give to the organization and record donor preference for a wrestler or the Training Fund at checkout.
              </p>
              <HardLink
                href="/fundraising/athletes"
                className={`${displayFont(
                  "mt-8 inline-flex min-h-[50px] w-full touch-manipulation items-center justify-center rounded-sm bg-[#CC0000] text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-[#a80000] sm:w-auto sm:px-10",
                )}`}
              >
                Support an athlete year-round →
              </HardLink>
            </div>
          </div>
        ) : (
          <ul className="mt-16 grid gap-10 md:grid-cols-2">
            {campaigns.map((c) => {
              const goal = c.goalCents && c.goalCents > 0 ? c.goalCents : null
              const pctOfGoal =
                goal && goal > 0 ? Math.round((c.raisedCents / goal) * 100) : null
              const barPct = pctOfGoal != null ? Math.min(100, pctOfGoal) : null
              const overGoal = pctOfGoal != null && pctOfGoal > 100
              const days = daysRemaining(c.endsAt)
              return (
                <li
                  key={c.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B2545] shadow-[0_28px_100px_-36px_rgba(0,0,0,0.9)] transition hover:border-[#C8A94A]/35"
                >
                  <div className="relative aspect-[16/9] w-full bg-black/50">
                    {(() => {
                      const heroSrc = c.heroImageUrl ?? "/images/spartan-race-banner.png"
                      const remote = /^https?:\/\//i.test(heroSrc)
                      return remote ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <Image
                          src={heroSrc}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={false}
                        />
                      )
                    })()}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-[#0B2545] via-[#0B2545]/20 to-transparent"
                      aria-hidden
                    />
                    {c.partnerLogoUrl ? (
                      <div className="absolute left-4 top-4 rounded-md border border-white/10 bg-white/95 p-2 shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.partnerLogoUrl} alt="" className="h-8 max-h-8 w-auto max-w-[140px] object-contain" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-5 md:px-7">
                    <h3
                      className={`${displayFont("text-xl font-black uppercase leading-snug text-white md:text-[1.4rem]")}`}
                    >
                      {c.name}
                    </h3>
                    <div className="mt-5 space-y-3">
                      <div className="flex flex-wrap justify-between gap-2 text-sm text-white/90">
                        <span className="font-semibold text-white">{formatUsdWhole(c.raisedCents)} raised</span>
                        {goal ? (
                          overGoal ? (
                            <span className="text-right font-semibold text-[#C8A94A]">
                              Over goal · {pctOfGoal}% ({formatUsdWhole(goal)} target)
                            </span>
                          ) : (
                            <span className="tabular-nums text-white">{formatUsdWhole(goal)} goal</span>
                          )
                        ) : (
                          <span className="italic text-white/75">Open goal</span>
                        )}
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-black/45 ring-1 ring-inset ring-white/10">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: barPct != null ? `${barPct}%` : "100%",
                            background: overGoal
                              ? "linear-gradient(90deg, #22c55e, #C8A94A)"
                              : `linear-gradient(90deg, ${GOLD}, ${NAVY})`,
                            opacity: barPct != null ? 1 : 1,
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/85">
                        <span>
                          <strong className="text-white">{c.participatingAthletes}</strong> athletes in
                        </span>
                        {days != null ? (
                          <span className={`${displayFont("font-extrabold uppercase tracking-wide text-[#CC0000]")}`}>
                            {days > 0 ? `${days} days left` : "Closing"}
                          </span>
                        ) : (
                          <span>Ongoing window</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-7">
                      <HardLink
                        href={c.href}
                        className={`${displayFont(
                          "inline-flex w-full min-h-[50px] touch-manipulation items-center justify-center rounded-sm border-2 border-white/15 bg-black/25 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition group-hover:border-[#CC0000]/55 group-hover:bg-[#CC0000]/12",
                        )}`}
                      >
                        Open Campaign →
                      </HardLink>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
