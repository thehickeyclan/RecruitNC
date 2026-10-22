import { notFound } from "next/navigation"

import { CoachEventReportView } from "@/app/coach-reports/[event]/page"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * A coach's tournament report exactly as that coach sees it, on a developer's machine
 * (/dev/coach-report-preview?coach=email-or-id&event=super32-2026). Like /dev/coach-preview it
 * shows one person's board to whoever asks, so it does not exist in a production build.
 */
export default async function CoachReportPreview({ searchParams }: { searchParams: Promise<{ coach?: string; event?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const { coach, event } = await searchParams
  if (!coach || !event) return <p style={{ padding: 24 }}>Add ?coach=email-or-id&amp;event=super32-2026</p>
  const admin = createAdminClient()
  const { data } = await admin.from("user_profiles").select("user_id").or(coach.includes("@") ? `email.ilike.${coach}` : `user_id.eq.${coach}`).maybeSingle()
  if (!data) return <p style={{ padding: 24 }}>No account for {coach}</p>
  return (
    <main className="min-h-screen bg-[#060f1f] px-4 py-6 sm:px-6">
      <CoachEventReportView userId={String(data.user_id)} event={event} />
    </main>
  )
}
