/**
 * Preview of this week's family emails, exactly as each family would get them (17 Oct 2026). Nothing
 * here sends. Sending is switched on with FAMILY_DIGEST_SEND=1 once Matt has read these.
 */
import { redirect } from "next/navigation"

import { buildFamilyDigests, renderFamilyDigest } from "@/lib/recruiting/family-digest"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300
export const metadata = { title: "Family email preview | Admin" }

export default async function FamilyDigestPreview() {
  const { data: auth } = await (await createClient()).auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Fadmin%2Ffamily-digest")
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
  if (!(me?.is_admin === true || me?.role === "admin")) redirect("/")

  const digests = await buildFamilyDigests(admin)
  const byTier = { free: 0, rankings: 0, portal: 0 }
  for (const d of digests) byTier[d.tier]++
  const sending = process.env.FAMILY_DIGEST_SEND === "1"

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">This week&apos;s family emails</h1>
        <p className="mt-1 text-sm text-white/60">
          {digests.length} email{digests.length === 1 ? "" : "s"} would go out: {byTier.free} free (count only, upgrade button), {byTier.rankings} Rankings, {byTier.portal} Command Center or Blue (program names).{" "}
          <b className={sending ? "text-emerald-300" : "text-amber-200"}>{sending ? "Sending is ON (Mondays)." : "Sending is OFF: nothing goes out until FAMILY_DIGEST_SEND=1."}</b>
        </p>
        <div className="mt-6 space-y-6">
          {digests.map((d) => {
            const { subject, html } = renderFamilyDigest(d)
            return (
              <section key={`${d.userId}-${d.athleteId}`} className="rounded-xl border border-white/10 bg-[#0d1d36] p-4">
                <p className="text-sm">
                  <b>To:</b> {d.email} · <b>Plan:</b> {d.tier} · <b>Views:</b> {d.views}
                </p>
                <p className="text-sm text-white/70">
                  <b>Subject:</b> {subject}
                </p>
                <iframe title={subject} srcDoc={html} sandbox="" className="mt-3 h-[460px] w-full rounded-lg bg-white" />
              </section>
            )
          })}
          {digests.length === 0 ? <p className="text-white/60">No family had college-coach views in the last seven days.</p> : null}
        </div>
      </div>
    </div>
  )
}
