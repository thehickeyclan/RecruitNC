import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileClient } from "./profile-client"
import { MyWrestlers, type MyWrestler } from "./my-wrestlers"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

/** The wrestlers this account owns or is a linked parent of. Never allowed to fail the page. */
async function loadMyWrestlers(userId: string): Promise<MyWrestler[]> {
  try {
    const admin = createAdminClient()
    const [{ data: owned }, { data: links }] = await Promise.all([
      admin.from("athletes").select("id").eq("claimed_by_user_id", userId),
      admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
    ])
    const self = new Set((owned ?? []).map((r) => String(r.id)))
    const ids = [...new Set([...self, ...(links ?? []).map((r) => String(r.athlete_id))])]
    if (!ids.length) return []
    const { data: rows } = await admin.from("athletes").select("id, name, graduationyear, highschool, photourl").in("id", ids)
    return (rows ?? [])
      .map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        classYear: r.graduationyear == null ? null : Number(r.graduationyear),
        school: (r.highschool as string | null) ?? null,
        photo: (r.photourl as string | null) ?? null,
        relationship: self.has(String(r.id)) ? ("self" as const) : ("parent" as const),
      }))
      .sort((x, y) => (x.relationship === y.relationship ? x.name.localeCompare(y.name) : x.relationship === "self" ? -1 : 1))
  } catch (e) {
    console.error("[profile] my wrestlers:", e)
    return []
  }
}

export default async function ProfilePage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/auth/signin")
    }

    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
            Loading profile…
          </div>
        }
      >
        <MyWrestlers wrestlers={await loadMyWrestlers(user!.id)} />
        <div className="border-t border-white/10 bg-[#0A1628] px-4 pt-6">
          <h2 className="mx-auto max-w-3xl text-sm font-black uppercase tracking-widest text-white/45">Account settings</h2>
        </div>
        <ProfileClient />
      </Suspense>
    )
  } catch (error) {
    console.error("[v0] Profile page error:", error)
    redirect("/auth/signin")
  }
}
