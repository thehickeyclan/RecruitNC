/**
 * RecruitWrestlers' Terms of Service, at www.recruitwrestlers.com/terms (middleware rewrites it here).
 * The text is components/legal/terms-body.tsx; NC United's copy is /terms on its own address.
 */
import type { Metadata } from "next"

import { TermsBody } from "@/components/legal/terms-body"
import { RwLogo } from "@/components/recruiting/rw-mark"
import { NATIONAL_BRAND } from "@/lib/recruiting/brand"

export const metadata: Metadata = {
  metadataBase: new URL(`https://${NATIONAL_BRAND.domain}`),
  title: { absolute: "Terms of Service | RecruitWrestlers" },
  description: "The terms for using RecruitWrestlers.",
  alternates: { canonical: "/terms" },
}

export default function RecruitWrestlersTerms() {
  return (
    <div className="min-h-screen bg-[#0B1426] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <a href="/" aria-label={NATIONAL_BRAND.name}>
            <RwLogo className="h-8 w-auto" />
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Terms of Service</h1>
        <div className="mt-4">
          <TermsBody operator="Guild Ventures LLC, which operates RecruitWrestlers" service="RecruitWrestlers" email="info@recruitwrestlers.com" />
        </div>
      </main>
    </div>
  )
}
