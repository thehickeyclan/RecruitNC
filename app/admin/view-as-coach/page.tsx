/**
 * View as coach (Matt, 27 Oct 2026: "i need a way of selecting a program and seeing what they see").
 * Every program with a coach on the platform; each coach opens My Recruits exactly as that coach
 * sees it, read-only (app/my-recruits ?as=), and their tournament reports (?as= on /coach-reports).
 * Admins only: app/admin/layout.tsx requires an admin.
 */
import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { isInternalAccount } from "@/lib/internal-accounts"
import { ViewAsCoachList, type ProgramRow } from "./view-as-coach-list"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "View as coach" }

export default async function ViewAsCoachPage() {
  const admin = createAdminClient()
  const { data: coaches } = await admin
    .from("user_profiles")
    .select("user_id, full_name, email, institution, school_id, verification_status, is_admin")
    .eq("verified_coach", true)
  const real = (coaches ?? []).filter((c) => c.is_admin !== true)
  const schoolIds = [...new Set(real.map((c) => c.school_id).filter(Boolean))] as string[]
  const { data: schools } = schoolIds.length ? await admin.from("schools").select("id, name").in("id", schoolIds) : { data: [] }
  const schoolName = new Map((schools ?? []).map((s) => [String(s.id), String(s.name)]))
  const byProgram = new Map<string, ProgramRow>()
  for (const c of real) {
    const program = (c.school_id && schoolName.get(String(c.school_id))) || (c.institution as string | null) || "No program on file"
    const row: ProgramRow = byProgram.get(program) ?? { program, coaches: [] }
    row.coaches.push({
      userId: String(c.user_id),
      name: (c.full_name as string | null) || (c.email as string | null) || "Coach",
      email: (c.email as string | null) ?? null,
      status: (c.verification_status as string | null) ?? null,
      test: isInternalAccount(c.email as string | null),
    })
    byProgram.set(program, row)
  }
  const programs = [...byProgram.values()].sort((a, b) => a.program.localeCompare(b.program))
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-white">
      <h1 className="text-3xl font-black">View as coach</h1>
      <p className="mt-1 text-sm text-white/60">
        Pick a program, then a coach: My Recruits opens exactly as that coach sees it, read-only. {programs.length} programs,{" "}
        {real.length} coaches.
      </p>
      <ViewAsCoachList programs={programs} />
    </main>
  )
}
