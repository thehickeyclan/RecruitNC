import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HardLink } from "@/components/hard-link"

export const metadata: Metadata = {
  title: "Fundraising playbook | NC United Wrestling",
  description: "NC United fundraising operations playbook — RecruitNC sign-in required.",
  robots: { index: false, follow: false },
}

/**
 * Entry URL for the staff playbook. Forces a RecruitNC session before sending admins to the full playbook.
 * Non-admins see an explanation (playbook APIs remain admin-only).
 */
export default async function FundraisingPlaybookGatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent("/fundraising/playbook")}`)
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profile?.is_admin) {
    redirect("/admin/fundraising")
  }

  return (
    <div
      className="min-h-[60vh] px-4 py-16"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif", backgroundColor: "#0B2545" }}
    >
      <div className="mx-auto max-w-lg rounded-xl border border-white/15 bg-black/25 p-8 text-white shadow-xl">
        <h1 className="font-[family-name:var(--font-fundraising-display)] text-2xl font-black uppercase tracking-tight text-white">
          Fundraising playbook
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/75">
          Looking for the <strong className="text-white">athlete and family playbook</strong> (how to ask, matching gifts, donor types)?{" "}
          <HardLink href="/fundraising/playbook/guide" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            Read the full guide here
          </HardLink>{" "}
          — no admin access required.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/75">
          You&apos;re signed in as <span className="font-medium text-white/90">{user.email}</span>. The NC United
          fundraising playbook (donor CRM, exports, and ops tools) is available only to{" "}
          <strong className="text-white">RecruitNC administrators</strong>.
        </p>
        <p className="mt-3 text-sm text-white/60">
          Need access? Ask an NC United admin to grant <code className="rounded bg-white/10 px-1">is_admin</code> on your
          profile, or use the public hub to support athletes.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <HardLink
            href="/fundraising"
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#CC0000] px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#a80000]"
          >
            Fundraising hub
          </HardLink>
          <a
            href="mailto:info@ncwrestlingunited.com"
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/20 px-6 text-sm font-semibold text-[#C8A94A] hover:bg-white/5"
          >
            Contact NC United
          </a>
        </div>
      </div>
    </div>
  )
}
