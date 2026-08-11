"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { CreateProfileForm } from "@/components/create-profile-form"

/** Auth only. The form itself lives in components/create-profile-form.tsx. */
export default function CreateProfilePage() {
  const { user, isLoading } = useAuth()

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

  return (
    <AuthGuard>
      <CreateProfileForm accountEmail={user.email ?? ""} />
    </AuthGuard>
  )
}
