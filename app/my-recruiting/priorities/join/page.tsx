import type { Metadata } from "next"

import { loadClaimAccount, relationshipForRole } from "@/lib/account-claim-role"
import { CLAIM_CONSENT_TEXT } from "@/lib/profile-claim"
import { invitePath, joinState, verifyInviteToken } from "@/lib/recruiting/priorities/invite-link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { JoinButton } from "./join-button"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Your part | What matters", robots: { index: false, follow: false } }

/**
 * Where a parent's invite lands (priorities part 5). Opening it changes nothing; the wrestler's own
 * account confirms with a tick and a button (app/api/recruiting-priorities/invite/accept).
 */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ a?: string; t?: string }> }) {
  const { a = "", t = "" } = await searchParams
  const admin = createAdminClient()
  const validLink = verifyInviteToken(a, t)
  const { data: auth } = await (await createClient()).auth.getUser()
  const userId = auth.user?.id ?? null
  const [athlete, account, link] = await Promise.all([
    validLink ? admin.from("athletes").select('"firstName", name, claimed_by_user_id').eq("id", a).maybeSingle().then((r) => r.data) : Promise.resolve(null),
    userId ? loadClaimAccount(admin, userId) : Promise.resolve(null),
    userId && validLink ? admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId).eq("athlete_id", a).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ])
  const state = joinState({
    validLink: validLink && Boolean(athlete),
    userId,
    relationship: account ? relationshipForRole({ role: account.role, profile_type: account.profileType }, null) : null,
    linkedParent: Boolean(link),
    claimedBy: athlete?.claimed_by_user_id ? String(athlete.claimed_by_user_id) : null,
  })
  const first = String(athlete?.firstName ?? "").trim() || String(athlete?.name ?? "").split(" ")[0] || "you"
  const here = invitePath(a, t)
  const survey = `/my-recruiting/priorities?w=${encodeURIComponent(a)}`

  return (
    <div id="join" className="min-h-[70vh] bg-[#0A1628] px-4 py-12 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-6">
        {state === "invalid" ? (
          <>
            <h1 className="text-2xl font-black">This link has expired</h1>
            <p className="mt-2 text-sm text-white/70">Ask your parent to send a new one from their Command Center.</p>
          </>
        ) : state === "sign_in" ? (
          <>
            <h1 className="text-2xl font-black">{first}, this part is yours</h1>
            <p className="mt-2 text-sm text-white/70">A few short questions about what you want from college. You control what gets shared with your parent, and coaches never see your answers.</p>
            <p className="mt-2 text-sm text-white/70">Make your own account first. Use your own email, not your parent&apos;s.</p>
            <a
              href={`/auth/signup?type=athlete&for=${encodeURIComponent(String(athlete?.name ?? first))}&returnTo=${encodeURIComponent(here)}`}
              className="mt-5 block rounded-lg bg-[#D3B574] px-5 py-3 text-center text-sm font-black text-[#0A1628]"
            >
              Make my account
            </a>
            <a href={`/auth/signin?returnTo=${encodeURIComponent(here)}`} className="mt-3 block text-center text-sm font-bold text-[#D3B574] hover:underline">
              I already have one. Sign in
            </a>
          </>
        ) : state === "parent_account" ? (
          <>
            <h1 className="text-2xl font-black">This link is for {first}</h1>
            <p className="mt-2 text-sm text-white/70">
              It needs {first}&apos;s own wrestler account, so the answers are really {first}&apos;s. Send the link to {first}, or sign out here and let {first} sign in.
            </p>
          </>
        ) : state === "claimed_by_other" ? (
          <>
            <h1 className="text-2xl font-black">This profile already has an account</h1>
            <p className="mt-2 text-sm text-white/70">Sign in with the account that owns it. If that is not right, contact us and we will sort it out.</p>
          </>
        ) : state === "already_yours" ? (
          <>
            <h1 className="text-2xl font-black">You&apos;re all set</h1>
            <a href={survey} className="mt-5 block rounded-lg bg-[#D3B574] px-5 py-3 text-center text-sm font-black text-[#0A1628]">
              Start my questions
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black">{first}, this part is yours</h1>
            <p className="mt-2 text-sm text-white/70">Confirm this is your profile, then answer a few short questions. You control what gets shared, and coaches never see your answers.</p>
            <JoinButton athleteId={a} token={t} consentText={CLAIM_CONSENT_TEXT.self} next={survey} />
          </>
        )}
      </section>
    </div>
  )
}
