import type { Metadata } from "next"

import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeEmail, recordUnsubscribe, verifyUnsubscribeToken } from "@/lib/email-unsubscribe"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Unsubscribe | NC United Wrestling",
  robots: { index: false, follow: false },
}

/**
 * The page the footer link lands on.
 *
 * It unsubscribes on arrival rather than asking for a confirming click. A confirmation step
 * reads as an obstacle to somebody who has already decided, and the people who meet it reach
 * for "report spam" instead - which costs the sending domain far more than the address did.
 * The token in the link is the consent.
 *
 * No sign-in, deliberately: most recipients have no account, and a login wall on an
 * unsubscribe is the thing regulators single out.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>
}) {
  const { e = "", t = "" } = await searchParams
  const email = normalizeEmail(e)
  const valid = Boolean(email) && verifyUnsubscribeToken(email, t)

  let done = false
  let failed = false
  if (valid) {
    const result = await recordUnsubscribe(createAdminClient(), email, "email_link")
    done = result.ok
    failed = !result.ok
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061224] px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D3B574]">
          NC United Wrestling
        </p>

        {done ? (
          <>
            <h1 className="mt-3 text-2xl font-bold text-white">You&apos;re unsubscribed</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              We&apos;ve removed <span className="text-white">{email}</span> from our email list.
              You won&apos;t get any more of these.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-white/45">
              This doesn&apos;t change your account or your NC United Blue membership, and you will
              still get anything you specifically asked for, like an order receipt.
            </p>
          </>
        ) : failed ? (
          <>
            <h1 className="mt-3 text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              We could not record that just now. Email{" "}
              <a className="text-[#D3B574] underline" href="mailto:info@ncwrestlingunited.com">
                info@ncwrestlingunited.com
              </a>{" "}
              and we will take you off by hand.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-bold text-white">This link isn&apos;t valid</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              It may have been cut short by your email app. Forward the message to{" "}
              <a className="text-[#D3B574] underline" href="mailto:info@ncwrestlingunited.com">
                info@ncwrestlingunited.com
              </a>{" "}
              and we will remove you.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
