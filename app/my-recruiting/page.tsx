/**
 * My Recruiting: the family's side of RecruitNC, on one page.
 *
 * Coaches got a portal (app/coach-home); a family had the same three facts scattered down their
 * wrestler's profile. For each wrestler this account claimed or is linked to as a parent: the
 * programs that wrote, the programs that looked, and what a coach will find missing. Nothing new
 * underneath - the panels are the profile's own, so the views paywall and messaging rules are the
 * same here as there.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { familyAthleteIds } from "@/lib/coach-messages"
import { completenessFromRow } from "@/lib/profile-completeness"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { MyRecruitingAthlete } from "./my-recruiting-athlete"

export const dynamic = "force-dynamic"

export const metadata = { title: "My Recruiting | RecruitNC" }

export default async function MyRecruitingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/my-recruiting")

  const admin = createAdminClient()
  const ids = await familyAthleteIds(admin, user.id)
  const { data: rows } = ids.length
    ? await admin
        .from("athletes")
        .select("id, name, firstName, graduationyear, highschool, photourl, academic_gpa, academic_sat, academic_act, highlight_video_url, phone, contactEmail")
        .in("id", ids)
        .order("graduationyear", { ascending: true })
    : { data: [] }
  const athletes = (rows ?? []).map((a) => ({
    id: String(a.id),
    name: String(a.name ?? "").trim() || "Your wrestler",
    firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "Your wrestler",
    classYear: a.graduationyear ? Number(a.graduationyear) : null,
    highSchool: a.highschool && a.highschool !== "Not specified" ? String(a.highschool) : null,
    photo: a.photourl ? String(a.photourl) : null,
    completeness: completenessFromRow(a as Record<string, unknown>),
  }))

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">RecruitNC</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">My Recruiting</h1>
        <p className="mt-1 text-sm text-white/60">
          Which college programs have written to you, which have looked at your profile, and what to add so more of them do.
        </p>

        {athletes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-lg font-bold">No wrestler on this account yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-white/60">
              Claim your profile, or link to your child&apos;s as a parent, and this page shows the colleges looking at it.
            </p>
            <Link href="/athletes" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
              Find the profile
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-10">
            {athletes.map((a) => (
              <MyRecruitingAthlete key={a.id} athlete={a} />
            ))}
          </div>
        )}

        <p className="mt-10 text-sm text-white/50">
          Looking for programs?{" "}
          <Link href="/recruiting/college-map" className="font-semibold text-[#D3B574] hover:underline">
            See every college wrestling program on the map
          </Link>
        </p>
      </div>
    </main>
  )
}
