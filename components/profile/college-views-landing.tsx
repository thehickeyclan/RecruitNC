"use client"

/**
 * Where the "college coaches are looking" email lands (?src=email-views, or ?views=1).
 *
 * The college-views panel shows only to the wrestler's own account or a linked parent, so the
 * email link alone dropped a signed-out parent on a public profile with no mention of college
 * views or the subscription - the email's whole promise, missing (Matt, 9 October 2026). This
 * says what to do in each case:
 *
 * - signed out: sign in (or create an account) and come straight back here;
 * - signed in as the wrestler or a linked parent: nothing to say - jump to the panel;
 * - signed in but not linked: link the wrestler to your account first.
 *
 * Renders nothing when the page was not opened from that link.
 */
import { useEffect, useState } from "react"
import { Eye } from "lucide-react"

export function CollegeViewsLanding({
  athleteName,
  signedIn,
  canSeePanel,
}: {
  athleteName: string
  signedIn: boolean
  /** The viewer is the wrestler, a linked parent or an admin - the panel is on the page. */
  canSeePanel: boolean
}) {
  const [fromEmail, setFromEmail] = useState(false)
  const [here, setHere] = useState("/")
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    // Back from checkout counts too: they paid to see this panel, so take them to it.
    setFromEmail(q.get("src") === "email-views" || q.get("views") === "1" || q.get("purchased") === "1")
    setHere(window.location.pathname + window.location.search)
  }, [])

  // The panel is here: take them to it once it has loaded.
  useEffect(() => {
    if (!fromEmail || !canSeePanel) return
    const t = setTimeout(() => document.getElementById("college-views")?.scrollIntoView({ behavior: "smooth", block: "start" }), 1200)
    return () => clearTimeout(t)
  }, [fromEmail, canSeePanel])

  if (!fromEmail || canSeePanel) return null
  const first = athleteName.trim().split(/\s+/)[0] || athleteName

  return (
    <div className="rounded-sm border-2 border-[#D3B574] bg-[#D3B574]/10 p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#D3B574]">
        <Eye className="h-4 w-4" aria-hidden /> College programs have viewed {first}&apos;s profile
      </p>
      {signedIn ? (
        <p className="mt-2 text-sm text-white/80">
          Which programs is only shown to {first}&apos;s own account or a linked parent. Tap{" "}
          <span className="font-semibold text-white">&ldquo;I&apos;m {first}&apos;s parent&rdquo;</span> further down this
          page (or &ldquo;This is my son or daughter&rdquo; if the profile is unclaimed), and they&apos;ll show here.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-white/80">
            Sign in to see which programs looked and when. It&apos;s shown only to {first}&apos;s family.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={`/auth/signin?returnTo=${encodeURIComponent(here)}`}
              className="inline-flex min-h-[44px] items-center rounded-sm bg-[#B31B1B] px-5 text-sm font-bold text-white hover:bg-[#8f1616]"
            >
              Sign in to see them
            </a>
            <a
              href={`/auth/signup?returnTo=${encodeURIComponent(here)}`}
              className="text-sm font-semibold text-white/80 underline underline-offset-2 hover:text-white"
            >
              New here? Create a free account
            </a>
          </div>
        </>
      )}
    </div>
  )
}
