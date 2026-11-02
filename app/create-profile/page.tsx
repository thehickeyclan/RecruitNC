"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { CreateProfileForm } from "@/components/create-profile-form"
import { FindExistingStep, type ExistingMatch } from "@/components/profile-wizard/find-existing-step"
import { RevealStep } from "@/components/profile-wizard/reveal-step"
import { ClaimDetails, ClaimExplainer } from "@/components/profile-wizard/claim-explainer"
import { WhoStep, type Who } from "@/components/profile-wizard/who-step"

/**
 * Creating a profile starts by looking for the one that already exists.
 *
 * Most wrestlers here never signed up — NC United built their profile because rankings needed it,
 * and 292 of 421 still have no owner. Someone who lands on "create" is usually looking for
 * something they do not know is there, and skipping the search is how one boy became both Jacob
 * McCord and Jake McCord.
 */
export default function CreateProfilePage() {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<"who" | "find" | "reveal" | "create">("find")
  /*
   * Who is claiming: asked first (Matt, 31 Oct 2026), unless the link already says (?as=) or the
   * account does. A verified sign-up returning with ?find= is the wrestler searching his own name.
   */
  const [who, setWho] = useState<Who | null>(() => {
    if (typeof window === "undefined") return null
    const p = new URLSearchParams(window.location.search)
    const as = p.get("as")
    if (as === "parent" || as === "self") return as
    return p.get("find") || p.get("name") ? "self" : null
  })
  const role = (profile?.profile_type ?? "").toLowerCase()
  // Each step opens at its top: the record screen kept the search list's scroll and opened at the bottom on a phone.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [step, who])
  const knownWho: Who | null = who ?? (role === "parent" ? "parent" : role === "athlete" ? "self" : null)
  const [typedName, setTypedName] = useState("")
  const [matchedId, setMatchedId] = useState<string | null>(null)

  /*
   * Just verified with no wrestler yet (?find=): the search opens already looking for that name.
   * The home page's name box sends ?look= instead (1 Nov 2026): same search, but it still asks
   * wrestler or parent first, because the person typing is as often a parent.
   */
  const [findName] = useState(() => {
    if (typeof window === "undefined") return ""
    const p = new URLSearchParams(window.location.search)
    return (p.get("find") || p.get("look") || "").trim().slice(0, 80)
  })

  // Back from making the account with the name already typed (?name=): straight to creating it.
  useEffect(() => {
    if (!user) return
    const asked = new URLSearchParams(window.location.search).get("name")?.trim()
    if (asked) {
      setTypedName(asked)
      setStep("create")
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rnc-ink text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-rnc-gold" />
          <p className="text-white/60">Loading…</p>
        </div>
      </div>
    )
  }

  /*
   * Searching is open; the account is asked for at the point it is needed.
   *
   * The whole page used to sit behind a sign-in wall, which contradicted the thing it is built
   * around: showing a wrestler the record we already hold is what makes claiming it worth doing,
   * and nobody creates an account to see something they have not been shown. A campaign sends
   * people here cold, so the search and the reveal are public and the wall moves to the two
   * places that genuinely need an owner - claiming, and creating from scratch.
   */
  if (step === "find" && !knownWho) {
    return (
      <div className="min-h-screen bg-[#0A1628] px-4 py-12">
        <ClaimExplainer />
        <WhoStep onPick={setWho} />
      </div>
    )
  }

  if (step === "find") {
    return (
      <div className="min-h-screen bg-[#0A1628] px-4 py-12">
        <ClaimExplainer />
        <FindExistingStep
          who={knownWho ?? "self"}
          initialName={findName}
          onClaim={(match: ExistingMatch) => {
            setMatchedId(match.id)
            setStep("reveal")
          }}
          onCreateNew={(name) => {
            setTypedName(name)
            setStep("create")
          }}
        />
        <ClaimDetails />
      </div>
    )
  }

  if (step === "reveal" && matchedId) {
    return (
      <div className="min-h-screen bg-[#0A1628] px-4 py-12">
        <RevealStep
          athleteId={matchedId}
          who={knownWho ?? "self"}
          onConfirm={(reveal) => {
            /*
             * The claim is finished on the profile, but the account comes first: signed out, "that's
             * my wrestler" goes straight to the sign-up (Matt, 31 Oct 2026) rather than to the profile
             * to find a second button. The confirmation link brings them back to the claim box.
             */
            const as = knownWho ?? "self"
            const claimAt = `/view-profile?id=${encodeURIComponent(reveal.athleteId)}&claim=1&as=${as}`
            router.push(user ? claimAt : `/auth/signup?type=${as === "parent" ? "parent" : "athlete"}&for=${encodeURIComponent(reveal.name)}&returnTo=${encodeURIComponent(claimAt)}`)
          }}
          onReject={() => {
            setMatchedId(null)
            setStep("find")
          }}
        />
      </div>
    )
  }

  /* Building a new profile writes to an owner, so this step is the one that needs the account. */
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rnc-ink p-4 text-white">
        <div className="w-full max-w-md rounded-sm border border-rnc-line bg-rnc-surface p-6">
          <h1 className="text-2xl font-black">First, a free account</h1>
          <p className="mt-2 text-white/60">
            We could not find {typedName ? `${typedName}` : "that wrestler"}, so we will build the
            profile from scratch. It takes a minute and brings you straight back here &mdash; the
            account is how you manage the profile afterwards.
          </p>
          <Button asChild className="mt-5 w-full rounded-sm bg-[#D3B574] font-bold text-[#0A1628] hover:brightness-110">
            {/* The typed name rides along, so nobody types it twice. */}
            <a href={`/auth/signup?type=${knownWho === "parent" ? "parent" : "athlete"}&returnTo=${encodeURIComponent(`/create-profile?as=${knownWho ?? "self"}${typedName ? `&name=${encodeURIComponent(typedName)}` : ""}`)}`}>Create my free account</a>
          </Button>
          <p className="mt-3 text-center text-sm text-white/60">
            <a href="/auth/signin?returnTo=%2Fcreate-profile" className="underline underline-offset-2">
              I already have an account
            </a>
          </p>
          <button
            type="button"
            onClick={() => setStep("find")}
            className="mt-4 block w-full text-center text-sm text-white/50 underline underline-offset-2"
          >
            Back to search
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <CreateProfileForm accountEmail={user.email ?? ""} initialName={typedName} />
    </AuthGuard>
  )
}
