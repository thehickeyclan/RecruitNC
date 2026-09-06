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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rnc-ink p-4 text-white">
        <div className="w-full max-w-md rounded-sm border border-rnc-line bg-rnc-surface p-6">
          <h1 className="text-2xl font-black">Sign in required</h1>
          <p className="mt-2 text-white/60">Please sign in to create your athlete profile.</p>
          <Button asChild className="mt-5 w-full rounded-sm bg-rnc-red text-white hover:bg-rnc-red-hover">
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    )
  }

  if (step === "find") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0A1628] px-4 py-12">
          <FindExistingStep
            onClaim={(match: ExistingMatch) => {
              /**
               * Show the record before the claim. Most wrestlers do not know NC United already
               * built their profile, and seeing their own results is what makes claiming it
               * obviously worth doing.
               */
              setMatchedId(match.id)
              setStep("reveal")
            }}
            onCreateNew={(name) => {
              setTypedName(name)
              setStep("create")
            }}
          />
        </div>
      </AuthGuard>
    )
  }

  if (step === "reveal" && matchedId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0A1628] px-4 py-12">
          <RevealStep
            athleteId={matchedId}
            onConfirm={(reveal) => {
              /** Claiming happens on the profile itself, where they can see what they are taking. */
              router.push(`/view-profile?id=${encodeURIComponent(reveal.athleteId)}&claim=1`)
            }}
            onReject={() => {
              setMatchedId(null)
              setStep("find")
            }}
          />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <CreateProfileForm accountEmail={user.email ?? ""} initialName={typedName} />
    </AuthGuard>
  )
}
