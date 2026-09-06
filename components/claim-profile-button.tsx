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
  const [state, setState] = useState<"checking" | "hidden" | "idle" | "claiming" | "done">("checking")
  const [doneAs, setDoneAs] = useState<"self" | "parent" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (claimedByUserId) {
      setState("hidden")
      return
    }
    let cancelled = false
    fetch("/api/profile/linked-athletes", { credentials: "include", cache: "no-store" })
      // 401 is signed out. Falling through to "idle" would show a button that only leads to
      // a login wall, so that case hides instead.
      .then((r) => (r.ok ? r.json() : r.status === 401 ? "signed-out" : null))
      .then((data) => {
        if (cancelled) return
        if (data === "signed-out" || !data) return setState("hidden")
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

  async function claim(relationship: "self" | "parent") {
    setState("claiming")
    try {
      const res = await fetch("/api/profile/claim-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, relationship }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not claim this profile")
      setDoneAs(relationship)
      setState("done")
      toast({
        title: relationship === "self" ? "Profile claimed" : "Linked",
        description:
          relationship === "self"
            ? "This profile is now yours to edit."
            : `${athleteName} is now on your account.`,
      })
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
      <p className="text-sm font-bold text-white">Is this your profile?</p>
      <p className="mt-1 text-sm text-white/60">
        Nobody has claimed {firstName} yet. Claiming lets you add film, a GPA and everything
        college coaches ask for.
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
          onClick={() => void claim("parent")}
          disabled={state === "claiming"}
          variant="outline"
          size="sm"
          className="min-h-[44px] border-white/25 bg-transparent text-white hover:bg-white/10"
        >
          <Users className="mr-2 h-4 w-4" />
          This is my son or daughter
        </Button>
      </div>
    </div>
  )
}
