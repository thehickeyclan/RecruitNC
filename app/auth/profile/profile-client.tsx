"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProfileClient() {
  const { user, session, signOut, loading: isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !session) {
      window.location.href = "/auth/signin"
    }
  }, [isLoading, session])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/"
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <h2 className="text-xl font-semibold">Loading profile...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="container py-10">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>View and manage your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">User ID</p>
            <p className="text-sm text-muted-foreground break-all">{user.id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Email Verified</p>
            <p className="text-sm text-muted-foreground">{user.email_confirmed_at ? "Yes" : "No"}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
