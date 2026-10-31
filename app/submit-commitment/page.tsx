import { BrandName } from "@/components/recruiting/brand-name"
import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { CommitmentForm, type AthleteHit, type CollegeOption } from "@/components/commitments/commitment-form"
import { SUBMITTER_ROLES, type SubmitterRole } from "@/lib/commitments/intake"

/** The college list is read live so a newly added programme is selectable immediately. */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Report a commitment",
  description: "Tell us where a wrestler is going to college.",
}

/** `?athlete=<id>` starts from that profile (its own page links here); `?role=` from Coach Home. */
export default async function SubmitCommitmentPage({ searchParams }: { searchParams: Promise<{ athlete?: string; role?: string }> }) {
  const sp = await searchParams
  const admin = createAdminClient()
  let initialAthlete: AthleteHit | null = null
  if (sp.athlete && /^[0-9a-f-]{36}$/i.test(sp.athlete)) {
    const { data: a } = await admin
      .from("athletes")
      .select('id, name, graduationyear, highschool, "wrestlingClub", college, photourl')
      .eq("id", sp.athlete)
      .maybeSingle()
    if (a) {
      initialAthlete = {
        id: String(a.id),
        name: String(a.name ?? ""),
        graduationYear: a.graduationyear ?? null,
        highSchool: a.highschool ?? null,
        club: a.wrestlingClub ?? null,
        college: String(a.college ?? "").trim() || null,
        photoUrl: a.photourl ?? null,
      }
    }
  }
  const initialRole = SUBMITTER_ROLES.includes(sp.role as SubmitterRole) ? (sp.role as SubmitterRole) : null
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#D3B574]"><BrandName ncu="NC United" /></p>
          <h1 className="text-3xl font-black sm:text-4xl">Report a commitment</h1>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            The wrestler, a parent or a coach: tell us where they are going. It takes about a minute, and once we check it, it goes on
            the profile and out to everyone on the app.
          </p>
        </header>

        <CommitmentForm colleges={colleges} initialAthlete={initialAthlete} initialRole={initialRole} />
      </div>
    </div>
  )
}
