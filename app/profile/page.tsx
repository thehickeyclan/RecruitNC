import { Suspense } from "react"
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
        <ProfileClient />
      </Suspense>
    )
  } catch (error) {
    console.error("[v0] Profile page error:", error)
    redirect("/auth/signin")
  }
}
