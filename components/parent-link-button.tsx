"use client"

import { useEffect, useState } from "react"
import { Users, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

/**
 * "I'm this wrestler's parent" — on the wrestler's own profile.
 *
 * Athletes create their own profiles, so a parent is never filling in a form. The only
 * thing a parent needs is to tie their account to a profile that already exists, and the
 * place they will be when they want that is their child's page.
 *
 * This writes parent_athlete_links, which is many-to-many, so a parent with three
 * wrestlers links all three. It deliberately does not touch claimed_by_user_id — that
 * stays with the athlete, and a parent linking does not take the profile off their kid.
 */
export function ParentLinkButton({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const [state, setState] = useState<"idle" | "checking" | "linking" | "linked" | "hidden">("checking")
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    // Only offer it if they are signed in and not already linked — an unauthenticated
    // visitor gets nothing rather than a button that bounces them to a login wall.
    fetch("/api/profile/linked-athletes", { credentials: "include", cache: "no-store" })
      // 401 means signed out. Returning null here would fall through to "idle" and show a
      // button that only leads to a login wall, so that case hides instead.
      .then((r) => (r.ok ? r.json() : r.status === 401 ? "signed-out" : null))
      .then((data) => {
        if (cancelled) return
        if (data === "signed-out") return setState("hidden")
        if (!data) return setState("idle")
        // The route returns { athletes, profileAthleteId } — athletes covers both the
        // account's own profile and every parent link.
        const linked =
          (data.athletes ?? []).some((a: { id?: unknown }) => String(a?.id) === String(athleteId)) ||
          String(data.profileAthleteId ?? "") === String(athleteId)
        setState(linked ? "linked" : "idle")
      })
      .catch(() => !cancelled && setState("hidden"))
    return () => {
      cancelled = true
    }
  }, [athleteId])

  async function link() {
    setState("linking")
    try {
      const res = await fetch("/api/profile/claim-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, relationship: "parent" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not link this profile")
      setState("linked")
      toast({ title: "Linked", description: `${athleteName} is now on your account.` })
    } catch (error: any) {
      setState("idle")
      toast({
        title: "Could not link",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  if (state === "checking" || state === "hidden") return null

  if (state === "linked") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <Check className="h-4 w-4" />
        {athleteName} is linked to your account
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void link()} disabled={state === "linking"} variant="outline" size="sm">
        {state === "linking" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
        I&apos;m {athleteName.split(" ")[0]}&apos;s parent
      </Button>
      <span className="text-xs text-gray-500">
        Links this wrestler to your account. You can link more than one.
      </span>
    </div>
  )
}
