import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileClient } from "./profile-client"
import { MyWrestlers } from "./my-wrestlers"
import { loadMyWrestlers, loadProfileAudience } from "./load-my-wrestlers"

export const dynamic = "force-dynamic"
export const revalidate = 0

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
        <MyWrestlers wrestlers={await loadMyWrestlers(user!.id)} audience={await loadProfileAudience(user!.id)} />
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
