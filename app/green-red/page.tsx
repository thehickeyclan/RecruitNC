"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import GreenRedButtons from "@/components/green-red-buttons"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function GreenRedPage() {
  const supabase = createClient()
  const [signedIn, setSignedIn] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session))
      setEmail(data.session?.user?.email ?? null)
    })
  }, [supabase])

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Quick Approve</h1>

      {!signedIn && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm mb-3">Please sign in to record your action.</p>
            <Button asChild className="bg-[#B31B1B] hover:bg-[#a50d25] text-white">
              <a href="/auth/signin">Sign in</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {signedIn && (
        <>
          <p className="text-sm text-muted-foreground mb-4">Signed in as {email || "user"}</p>
          <GreenRedButtons targetType="page" targetId="green-red-demo" />
        </>
      )}
    </main>
  )
}
