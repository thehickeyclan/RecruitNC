/**
 * Staff activity: the full list behind the card on Coach Home. Who added, moved, contacted or
 * messaged which wrestler on the program's shared board (lib/recruiting/staff-activity.ts).
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { StaffActivityList } from "@/components/recruiting/staff-activity-list"
import { loadStaffActivity } from "@/lib/recruiting/staff-activity"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = { title: "Staff activity | RecruitNC" }

export default async function StaffActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/signin?returnTo=/my-recruits/activity")

  const items = await loadStaffActivity(createAdminClient(), user.id, 200).catch(() => null)

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/my-recruits" className="inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
          <ArrowLeft className="h-3 w-3" /> My Recruits
        </Link>
        <h1 className="mt-3 text-2xl font-black">Staff activity</h1>
        <p className="mt-1 text-sm text-white/55">
          Everything you and your staff did on your shared board, newest first: wrestlers added or removed, stage changes, applications, logged
          contacts and messages.
        </p>
        <div className="mt-5 rounded-xl border border-white/10 bg-[#0f1c2e] p-4 sm:p-5">
          {items == null ? (
            <p className="text-sm text-white/55">The activity list could not be loaded just now. Refresh to try again.</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-white/55">Nothing yet. Star a wrestler and the record starts here.</p>
          ) : (
            <StaffActivityList items={items} />
          )}
        </div>
      </div>
    </main>
  )
}
