"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { CreateProfileForm } from "@/components/create-profile-form"
import { FindExistingStep, type ExistingMatch } from "@/components/profile-wizard/find-existing-step"
import { RevealStep } from "@/components/profile-wizard/reveal-step"

/**
 * Creating a profile starts by looking for the one that already exists.
 *
 * Most wrestlers here never signed up — NC United built their profile because rankings needed it,
 * and 292 of 421 still have no owner. Someone who lands on "create" is usually looking for
 * something they do not know is there, and skipping the search is how one boy became both Jacob
 * McCord and Jake McCord.
 */
export default function CreateProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<"find" | "reveal" | "create">("find")
  const [typedName, setTypedName] = useState("")
  const [matchedId, setMatchedId] = useState<string | null>(null)

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
  if (step === "find") {
    return (
      <div className="min-h-screen bg-[#0A1628] px-4 py-12">
        <FindExistingStep
          onClaim={(match: ExistingMatch) => {
            setMatchedId(match.id)
            setStep("reveal")
          }}
          onCreateNew={(name) => {
            setTypedName(name)
            setStep("create")
          }}
        />
      </div>
    )
  }

  if (step === "reveal" && matchedId) {
    return (
      <div className="min-h-screen bg-[#0A1628] px-4 py-12">
        <RevealStep
          athleteId={matchedId}
          onConfirm={(reveal) => {
            /** Claiming happens on the profile itself, where the claim card asks for the account. */
            router.push(`/view-profile?id=${encodeURIComponent(reveal.athleteId)}&claim=1`)
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
          <Button asChild className="mt-5 w-full rounded-sm bg-rnc-red text-white hover:bg-rnc-red-hover">
            <a href="/auth/signup?returnTo=%2Fcreate-profile">Create my free account</a>
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
