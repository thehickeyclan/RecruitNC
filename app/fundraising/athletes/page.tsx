import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { getFundraisingAthletesIndexRows } from "@/lib/fundraising/athlete-fundraising-profiles"
import { HardLink } from "@/components/hard-link"

export const metadata: Metadata = {
  title: "Athletes | NC United Fundraising",
  description:
    "Support NC United wrestlers — donor-facing pages. Tax-deductible 501(c)(3) gifts. Not college recruiting profiles.",
}

export default async function FundraisingAthletesIndexPage() {
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const rows = await getFundraisingAthletesIndexRows(admin, entries)

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-12 text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#C8A94A]">
          NC United
        </p>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Fundraising — Athletes
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          Give toward a specific wrestler. These pages are for families, fans, and sponsors —{" "}
          <strong className="text-white/90">not</strong> college recruiting profiles.
        </p>
        <HardLink
          href="/fundraising"
          className="mt-6 inline-block text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← Back to fundraising hub
        </HardLink>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.athleteId}>
              <HardLink
                href={`/fundraising/athletes/${r.hrefSlug}`}
                className="flex flex-row gap-4 rounded-lg border border-white/10 bg-[#0B2545]/80 px-4 py-4 transition hover:border-[#C8A94A]/40"
              >
                {r.photoUrl ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.photoUrl} alt="" className="h-full w-full object-cover object-top" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <span className="font-[family-name:var(--font-fundraising-display)] text-lg font-bold text-white">
                    {r.displayName}
                  </span>
                  {r.sublabel ? <p className="mt-0.5 text-sm text-white/55">{r.sublabel}</p> : null}
                  <span className="mt-1 block font-mono text-xs text-white/45">{r.code}</span>
                </div>
              </HardLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
