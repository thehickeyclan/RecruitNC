import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import type { ReactNode } from "react"

function norm(s: string) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function normSchool(s: string) {
  let t = norm(s)
  for (const suffix of [" high school", " hs", " high"]) {
    if (t.endsWith(suffix)) t = t.slice(0, -suffix.length).trim()
  }
  return t.replace(/\./g, "").replace(/\s+/g, " ").trim()
}

/** Athletes table has name and wrestling_name; firstname/lastname do not exist. */
function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  return (row.wrestling_name as string)?.trim() || ""
}

function ByNameShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border border-white/10 bg-[#0f1c2e] p-8 text-center">
        {children}
      </div>
    </main>
  )
}

export default async function UnifiedProfileByNamePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; school?: string; year?: string }>
}) {
  const params = await searchParams
  const name = (params.name || "").trim()
  const school = (params.school || "").trim()
  const year = params.year || "2028"
  const yearNum = parseInt(year, 10)

  if (!name) {
    return (
      <ByNameShell>
        <p className="text-white/70 mb-4">
          Missing name. Use ?name=First+Last&amp;school=School&amp;year=2028
        </p>
        <HardLink href="/public-rankings/2028" className="text-[#D3B574] underline underline-offset-4">
          Back to 2028 rankings
        </HardLink>
      </ByNameShell>
    )
  }

  const supabase = createAdminClient()

  let { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, name, wrestling_name, highschool")
    .in("graduationyear", [yearNum, year])
  if ((error || !athletes?.length) && supabase) {
    const fallback = await supabase
      .from("athletes")
      .select("id, name, wrestling_name, highschool")
      .in("graduation_year", [yearNum, year])
    if (fallback.data?.length) {
      athletes = fallback.data
      error = fallback.error
    }
  }

  if (error || !athletes?.length) {
    return (
      <ByNameShell>
        <p className="text-white/70 mb-4">
          No profile found for {name}
          {school ? ` at ${school}` : ""}.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <HardLink href="/create-profile" className="text-[#D3B574] underline underline-offset-4">
            Create profile
          </HardLink>
          <span className="text-white/30">|</span>
          <HardLink href="/public-rankings/2028" className="text-[#D3B574] underline underline-offset-4">
            Back to rankings
          </HardLink>
        </div>
      </ByNameShell>
    )
  }

  const wantName = norm(name)
  const wantSchoolNorm = normSchool(school)
  const match = athletes.find((a) => {
    const row = a as Record<string, unknown>
    const full = getFullName(row)
    if (norm(full) !== wantName) return false
    if (!wantSchoolNorm) return true
    const hs = normSchool((row.highschool as string) || "")
    return hs === wantSchoolNorm || hs.includes(wantSchoolNorm) || wantSchoolNorm.includes(hs)
  })

  const id = match ? ((match as Record<string, unknown>).id as string) : null
  if (id) redirect(`/view-profile?id=${encodeURIComponent(id)}`)

  return (
    <ByNameShell>
      <p className="text-white/70 mb-4">
        No profile found for {name}
        {school ? ` at ${school}` : ""}.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <HardLink href="/create-profile" className="text-[#D3B574] underline underline-offset-4">
          Create profile
        </HardLink>
        <span className="text-white/30">|</span>
        <HardLink href="/public-rankings/2028" className="text-[#D3B574] underline underline-offset-4">
          Back to rankings
        </HardLink>
      </div>
    </ByNameShell>
  )
}
