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

    return <ProfileClient />
  } catch (error) {
    console.error("[v0] Profile page error:", error)
    redirect("/auth/signin")
  }
}
