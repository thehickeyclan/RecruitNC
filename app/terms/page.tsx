/**
 * NC United's Terms of Service, for its accounts and its recruiting pages (RecruitNC). The text is
 * components/legal/terms-body.tsx; recruitwrestlers.com/terms shows RecruitWrestlers' copy.
 */
import type { Metadata } from "next"

import { TermsBody } from "@/components/legal/terms-body"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using NC United's website, accounts and recruiting pages.",
}

export default function Terms() {
  return (
    <main className="min-h-screen bg-rnc-ink px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold tracking-[0.2em] text-rnc-gold">NC UNITED</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Terms of Service</h1>
        <div className="mt-6">
          <TermsBody operator="NC United Wrestling" service="NC United's website and app, including RecruitNC" email="info@ncwrestlingunited.com" />
        </div>
      </div>
    </main>
  )
}
