import Image from "next/image"
import type { FundraisingHubCampaignCard } from "@/lib/fundraising/hub-data"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"

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

export function GiveFeaturedCampaign({
  campaign,
  additionalActiveCount = 0,
}: {
  campaign: FundraisingHubCampaignCard
  additionalActiveCount?: number
}) {
  const goal = campaign.goalCents && campaign.goalCents > 0 ? campaign.goalCents : null
  const pctOfGoal = goal && goal > 0 ? Math.round((campaign.raisedCents / goal) * 100) : null
  const barPct = pctOfGoal != null ? Math.min(100, pctOfGoal) : null
  const overGoal = pctOfGoal != null && pctOfGoal > 100
  const days = daysRemaining(campaign.endsAt)
  const heroSrc = campaign.heroImageUrl ?? "/images/spartan-race-banner.png"
  const heroAlt = `${campaign.name} — campaign visual`
  const remote = /^https?:\/\//i.test(heroSrc)

  return (
    <section className="mx-auto max-w-lg px-4 pb-2 pt-2" aria-labelledby="give-featured-heading">
      <p className={`${displayFont("text-center text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#CC0000]")}`}>
        Active campaign
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-[#C8A94A]/30 bg-[#0B2545]/50 shadow-[0_20px_70px_-28px_rgba(0,0,0,0.65)]">
        <div className="relative aspect-[16/9] w-full bg-black/50">
          {remote ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroSrc} alt={heroAlt} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Image src={heroSrc} alt={heroAlt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 32rem" priority />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#061224] via-[#061224]/35 to-transparent"
            aria-hidden
          />
          {campaign.partnerLogoUrl ? (
            <div className="absolute left-3 top-3 rounded-md border border-white/10 bg-white/95 p-1.5 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={campaign.partnerLogoUrl}
                alt=""
                className="h-7 max-h-7 w-auto max-w-[120px] object-contain"
              />
            </div>
          ) : null}
        </div>
        <div className="space-y-4 px-4 pb-5 pt-4 sm:px-5">
          <h2 id="give-featured-heading" className={`${displayFont("text-xl font-black uppercase leading-snug text-white")}`}>
            {campaign.name}
          </h2>
          <div className="space-y-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-white/55">
              <span className="font-semibold text-white/80">{formatUsdWhole(campaign.raisedCents)} raised</span>
              {goal ? (
                overGoal ? (
                  <span className="text-right font-semibold text-[#C8A94A]">
                    Over goal · {pctOfGoal}% ({formatUsdWhole(goal)} target)
                  </span>
                ) : (
                  <span className="tabular-nums">{formatUsdWhole(goal)} goal</span>
                )
              ) : (
                <span className="italic text-white/40">Open goal</span>
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
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/50">
              <span>
                <strong className="text-white/80">{campaign.participatingAthletes}</strong> athletes in
              </span>
              {days != null ? (
                <span className={`${displayFont("text-[11px] font-extrabold uppercase tracking-wide text-[#CC0000]")}`}>
                  {days > 0 ? `${days} days left` : "Closing"}
                </span>
              ) : (
                <span>Ongoing window</span>
              )}
            </div>
          </div>
          <HardLink
            href={campaign.href}
            className={`${displayFont("inline-flex w-full min-h-[48px] items-center justify-center rounded-sm bg-[#CC0000] text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#a80000] sm:text-sm")}`}
          >
            Open campaign →
          </HardLink>
          {additionalActiveCount > 0 ? (
            <p className="text-center text-[11px] text-white/45">
              + {additionalActiveCount} more active {additionalActiveCount === 1 ? "drive" : "drives"} on the{" "}
              <HardLink href="/fundraising#fundraising-active-campaigns" className="text-[#C8A94A] underline-offset-4 hover:underline">
                fundraising hub
              </HardLink>
              .
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
