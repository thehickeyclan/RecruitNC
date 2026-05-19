import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import { NC_UNITED_CONTRIBUTIONS_TAX_DISCLAIMER } from "@/lib/fundraising/donor-facing-disclosures"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { resolveFundraisingAthletePublic } from "@/lib/fundraising/athlete-fundraising-profiles"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  if (!resolved) return { title: "Thank you | NC United Fundraising" }
  const name =
    resolved.entry?.fullName?.trim() ||
    resolved.entry?.label?.trim() ||
    resolved.fallbackDisplayName?.trim() ||
    "Athlete"
  return {
    title: `Thank you · ${name} | NC United Fundraising`,
    description: `Training Fund charitable gift tied to ${name}; NC United acknowledgement follows checkout.`,
  }
}

export default async function FundraisingAthleteThanksPage({ params }: Props) {
  const { slug } = await params
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  if (!resolved) notFound()

  const name =
    resolved.entry?.fullName?.trim() ||
    resolved.entry?.label?.trim() ||
    resolved.fallbackDisplayName?.trim() ||
    "this athlete"
  const backHref = `/fundraising/athletes/${encodeURIComponent(slug)}`

  return (
    <div
      className="flex min-h-screen flex-col bg-[#061224] text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="border-b border-white/10 bg-[#0B2545]/40 px-4 py-5">
        <div className="mx-auto flex max-w-lg justify-between gap-3">
          <HardLink href={backHref} className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            ← {name}
          </HardLink>
          <HardLink
            href="/fundraising"
            className="text-xs font-semibold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-[#C8A94A] hover:underline"
          >
            Hub
          </HardLink>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-14 text-center sm:py-20">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United
        </p>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-4 text-[clamp(1.75rem,5vw,2.35rem)] font-black uppercase leading-tight tracking-tight text-white">
          Thank you
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/78">
          Thank you — your charitable gift to NC United Wrestling for the NC United Training Fund, noted in connection with {name} as you elected at checkout,
          is processing. Watch for acknowledgement email shortly (check spam or promotions). Support flows under nonprofit policy toward eligible wrestling
          training and competition costs — not cash paid directly to {name}.
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-white/50">{NC_UNITED_CONTRIBUTIONS_TAX_DISCLAIMER}</p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/55">
          EIN <span className="tabular-nums">99-3757238</span>
          {" · "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
        <HardLink
          href={backHref}
          className="font-[family-name:var(--font-fundraising-display)] mx-auto mt-10 inline-flex min-h-[48px] items-center justify-center border border-[#C8A94A]/50 bg-[#0B2545]/40 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white hover:border-[#C8A94A] hover:bg-[#0B2545]/70"
        >
          Back to gift page
        </HardLink>
      </main>
    </div>
  )
}
