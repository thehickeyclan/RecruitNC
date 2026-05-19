import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { getFundraisingAthletesIndexRows } from "@/lib/fundraising/athlete-fundraising-profiles"
import { HardLink } from "@/components/hard-link"
import { FundraisingAthletesDirectory } from "./fundraising-athletes-directory"

export const metadata: Metadata = {
  title: "Athletes | NC United Fundraising",
  description:
    "NC United Wrestling athlete pages — charitable gifts for the NC United Training Fund noted in relation to wrestlers where donors choose at checkout.",
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
          Contributions are charitable gifts to NC United Wrestling for the NC United Training Fund — name an athlete at checkout when you want the acknowledgement
          framed for qualifying training and competition tied to them. Built for families, fans, and sponsors —{" "}
          <strong className="text-white/90">not</strong> college recruiting profiles.
        </p>
        <HardLink
          href="/fundraising"
          className="mt-6 inline-block text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← Back to fundraising hub
        </HardLink>

        <FundraisingAthletesDirectory rows={rows} />
      </div>
    </div>
  )
}
