import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileClient } from "./profile-client"

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
        {/* One in five people who land here leave immediately for /prospects/all,
            /view-profile or /athletes, and another one in eight reload this page. They came
            looking for a wrestler and the navigation said "Profile". This catches them at the
            moment they realise, rather than making them hunt through the menu again. */}
        <div className="bg-slate-50 px-4 pt-6">
          <Link
            href="/prospects/all"
            className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-[#D3B574] bg-white px-4 py-3 shadow-sm transition-colors hover:bg-[#FBF6E9]"
          >
            <Search className="h-5 w-5 shrink-0 text-[#0A1628]" aria-hidden="true" />
            <span className="min-w-0 text-sm text-slate-700">
              <b className="text-[#0A1628]">Looking for a wrestler&rsquo;s profile?</b> This page is
              your own account. Browse every North Carolina athlete instead.
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#0A1628]" aria-hidden="true" />
          </Link>
        </div>
        <ProfileClient />
      </Suspense>
    )
  } catch (error) {
    console.error("[v0] Profile page error:", error)
    redirect("/auth/signin")
  }
}
