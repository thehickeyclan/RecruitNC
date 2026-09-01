import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { CommitmentForm, type CollegeOption } from "@/components/commitments/commitment-form"

/** The college list is read live so a newly added programme is selectable immediately. */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Announce your commitment | NC United Wrestling",
  description: "Tell North Carolina wrestling where you are going to college.",
}

export default async function SubmitCommitmentPage() {
  const admin = createAdminClient()
  const { data } = await admin.from("colleges").select("id, name, division, logo_url").order("name")

  const colleges: CollegeOption[] = (data ?? []).map((c) => ({
    id: String(c.id),
    name: c.name,
    division: c.division ?? null,
    logoUrl: c.logo_url ?? null,
  }))

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-14 text-white sm:py-20">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#D3B574]">NC United Wrestling</p>
          <h1 className="text-3xl font-black sm:text-4xl">Announce your commitment</h1>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            You put in the work. Tell North Carolina where you are going — it takes about a minute.
          </p>
        </header>

        <CommitmentForm colleges={colleges} />
      </div>
    </div>
  )
}
