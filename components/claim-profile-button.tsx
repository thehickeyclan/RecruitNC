"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

/**
 * "Is this your profile?" — on an unclaimed wrestler's page.
 *
 * 292 of 421 profiles have no owner: NC United built them because rankings needed them, and
 * the wrestler usually does not know one exists. Until now the only way to claim one was to
 * guess that /create-profile searches for you, which nobody arriving from a link or a search
 * result will do. A profile with no owner is also a profile nobody can add film, a GPA or an
 * intended major to, so this is upstream of most of what a scouting report is missing.
 *
 * Asks rather than assumes, because the two answers are genuinely different relationships:
 *
 *   self   — sets claimed_by_user_id. One owner, and it is the wrestler's.
 *   parent — writes parent_athlete_links, which is many-to-many so a parent with three
 *            wrestlers links all three, and never takes the profile off the kid.
 *
 * Signed-in only. An unauthenticated visitor gets nothing rather than a button that bounces
 * them into a login wall, which is the same rule ParentLinkButton follows.
 */
export function ClaimProfileButton({
  athleteId,
  athleteName,
  /** Skips the whole prompt when somebody already owns this profile. */
  claimedByUserId,
}: {
  athleteId: string
  athleteName: string
  claimedByUserId?: string | null
}) {
  const [state, setState] = useState<
    "checking" | "hidden" | "signed-out" | "idle" | "claiming" | "done"
  >("checking")
  // Where to come back to after signing in — this profile, not the home page.
  const returnTo = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search
  const [doneAs, setDoneAs] = useState<"self" | "parent" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (claimedByUserId) {
      setState("hidden")
      return
    }
    let cancelled = false
    fetch("/api/profile/linked-athletes", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : r.status === 401 ? "signed-out" : null))
      .then((data) => {
        if (cancelled) return
        // Signed out used to hide this, on the reasoning that the button would only lead to a
        // login wall. That was backwards. An unclaimed profile shows no edit controls either,
        // so hiding this left a wrestler looking at his own page with nothing to press and no
        // hint that signing in would change that — Bodie Welker, in the Tournament of Champions
        // field, had to message us to ask how to change his photo. A visible sign-in is a door;
        // an empty page is not.
        if (data === "signed-out") return setState("signed-out")
        if (!data) return setState("hidden")
        const alreadyLinked =
          (data.athletes ?? []).some((a: { id?: unknown }) => String(a?.id) === String(athleteId)) ||
          String(data.profileAthleteId ?? "") === String(athleteId)
        setState(alreadyLinked ? "hidden" : "idle")
      })
      .catch(() => !cancelled && setState("hidden"))
    return () => {
      cancelled = true
    }
  }, [athleteId, claimedByUserId])

  /*
   * College coaches have looked at this profile. The strongest reason a family has to claim it -
   * and the claim is what leads to the subscription that shows which programs. Yes or no only.
   */
  const [collegeViewed, setCollegeViewed] = useState(false)
  useEffect(() => {
    if (state !== "idle") return
    let cancelled = false
    fetch(`/api/athletes/${encodeURIComponent(athleteId)}/college-interest`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { viewed: false }))
      .then((d) => { if (!cancelled) setCollegeViewed(d.viewed === true) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [state, athleteId])

  const [signing, setSigning] = useState(false)
  const [signedName, setSignedName] = useState("")

  async function claim(relationship: "self" | "parent") {
    setState("claiming")
    try {
      const res = await fetch("/api/profile/claim-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, relationship, signedName: signedName.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not claim this profile")
      setDoneAs(relationship)
      setState("done")
      toast({
        title: relationship === "self" ? "Profile claimed" : "Linked",
        description:
          relationship === "self"
            ? "Now check the details are right."
            : `${athleteName} is now on your account.`,
      })
      /*
       * Straight into the one form. A claim used to end here, on a page built from results, with
       * nothing saying what to do next - so families arrived at a profile and left it exactly as
       * they found it. Claiming is the start of filling it in, not the end of anything.
       */
      window.location.href = `/profile-setup?id=${encodeURIComponent(athleteId)}`
    } catch (error: any) {
      setState("idle")
      toast({
        title: "Could not claim",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  if (state === "checking" || state === "hidden") return null

  if (state === "signed-out") {
    return (
      <div className="rounded-sm border border-[#D3B574]/40 bg-[#D3B574]/10 p-4">
        <p className="text-sm font-semibold text-white">Is this you, or your wrestler?</p>
        <p className="mt-1 text-sm text-white/60">
          A free account lets you claim {athleteName}&apos;s profile — then you can change the
          photo, weight, club, contact details and more.
        </p>
        {/*
          * Create first, sign in second. Someone who has just found their son's page almost
          * never has an account yet, and the only button said Sign in - the one thing they
          * could not do. Both return here once they are done.
          */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`}
            className="inline-flex min-h-[44px] items-center rounded-sm bg-[#B31B1B] px-4 text-sm font-bold text-white hover:bg-[#8f1616]"
          >
            Create a free account
          </a>
          <a
            href={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`}
            className="text-sm font-semibold text-white/80 underline underline-offset-2 hover:text-white"
          >
            I already have one
          </a>
        </div>
      </div>
    )
  }

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-400">
        <Check className="h-4 w-4" />
        {doneAs === "self"
          ? "This profile is yours — you can edit it now."
          : `${athleteName} is linked to your account.`}
      </p>
    )
  }

  const firstName = athleteName.trim().split(/\s+/)[0]

  return (
    <div className="rounded-sm border border-[#D3B574]/40 bg-[#D3B574]/5 p-4">
      {collegeViewed ? (
        <p className="mb-2 inline-flex items-center gap-2 rounded-sm bg-[#D3B574] px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0A1628]">
          College programs have viewed this profile
        </p>
      ) : null}
      <p className="text-sm font-bold text-white">Is this your profile?</p>
      <p className="mt-1 text-sm text-white/60">
        {collegeViewed
          ? `Claim ${firstName}'s profile to see which programs are looking, and add the film, GPA and contact details they'll want next.`
          : `Nobody has claimed ${firstName} yet. Claiming lets you add film, a GPA and everything college coaches ask for.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => void claim("self")}
          disabled={state === "claiming"}
          className="min-h-[44px] bg-[#B31B1B] text-white hover:bg-[#8f1616]"
          size="sm"
        >
          {state === "claiming" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <User className="mr-2 h-4 w-4" />
          )}
          Yes, this is me
        </Button>
        <Button
          onClick={() => setSigning(true)}
          disabled={state === "claiming"}
          variant="outline"
          size="sm"
          className="min-h-[44px] border-white/25 bg-transparent text-white hover:bg-white/10"
        >
          <Users className="mr-2 h-4 w-4" />
          This is my son or daughter
        </Button>
      </div>

      {/*
        * A parent claiming a child's page signs for it.
        *
        * Cole Shuster claimed Austin Laws - another family's son - with one tap, and nothing
        * asked who he was. Typing a name is not proof, but it is a statement by a person, it is
        * recorded with the wording they agreed to, and it makes the claim a deliberate act
        * rather than a mis-tap.
        */}
      {signing && (
        <div className="mt-4 space-y-3 rounded-sm border border-white/15 bg-[#0A1628] p-4">
          <p className="text-sm leading-relaxed text-white/80">
            I confirm I am the parent or legal guardian of <strong className="text-white">{athleteName}</strong>.
            I consent, on their behalf, to RecruitNC showing their wrestling results, school, weight
            class and graduating year on a public profile, and to managing that profile for them. I
            can ask for it to be removed at any time.
          </p>
          <div className="space-y-2">
            <label htmlFor="claim-signature" className="block text-xs font-semibold uppercase tracking-wide text-white/50">
              Type your full name to sign
            </label>
            <input
              id="claim-signature"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              className="w-full rounded-sm border border-white/20 bg-transparent px-3 py-2 text-white outline-none focus:border-[#D3B574]"
              autoComplete="name"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void claim("parent")}
              disabled={state === "claiming" || signedName.trim().length < 3}
              size="sm"
              className="min-h-[44px] bg-[#B31B1B] text-white hover:bg-[#8f1616]"
            >
              {state === "claiming" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign and link {firstName}
            </Button>
            <button
              type="button"
              onClick={() => setSigning(false)}
              className="text-sm text-white/60 underline underline-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
