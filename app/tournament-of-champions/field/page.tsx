import type { Metadata } from "next"

import { TocPublicFieldGrid } from "@/components/toc/field/toc-public-field-grid"
import { TocVarsityHeading, tocContainerClass, tocSectionClass } from "@/components/toc/toc-theme"
import { HardLink } from "@/components/hard-link"
import { listPublicWeightTiles } from "@/lib/toc/public-announced-field"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "The Field | Tournament of Champions 2026",
  description:
    "Announced wrestlers for the NC United Tournament of Champions, by weight class. Listed alphabetically — the field is not seeded.",
}

/**
 * Public field hub. Every weight class is listed so the release cadence is visible, but only weights media
 * has released carry a count or a link. Unreleased weights are gated in
 * {@link listPublicWeightTiles} on the server — this page never receives their athletes.
 */
export default async function TocPublicFieldPage() {
  const tiles = await listPublicWeightTiles()
  const releasedCount = tiles.filter((t) => t.announced).length

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className={tocSectionClass()}>
        <div className={tocContainerClass("max-w-5xl")}>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            NC United · By invitation only
          </p>
          <TocVarsityHeading as="h1" className="mt-3 text-center text-white">
            The Field
          </TocVarsityHeading>

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/60">
            Athletes are announced by weight class. Each name is an individual invitation —
            athletes are <strong className="text-white/75">listed alphabetically and the field is not seeded</strong>.
            Brackets and seeds are released separately.
          </p>

          <div className="mt-10">
            {releasedCount === 0 ? (
              <p className="rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
                No weight classes announced yet. Follow the announcements to see each field as it drops.
              </p>
            ) : (
              <TocPublicFieldGrid tiles={tiles} />
            )}
          </div>

          <p className="mt-10 text-center text-sm text-white/45">
            <HardLink
              href="/tournament-of-champions"
              className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
            >
              Back to Tournament of Champions
            </HardLink>
          </p>
        </div>
      </section>
    </div>
  )
}
