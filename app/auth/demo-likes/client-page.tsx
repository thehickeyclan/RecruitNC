"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LikeButton } from "@/components/like-button"
import { useAuth } from "@/contexts/auth-context"

export default function DemoLikesClient() {
  const { user, loading: authLoading } = useAuth()
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: athletes } = await supabase.from("athletes").select("*").order("name").limit(10)
      setAthletes(athletes || [])
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Commitment Likes Demo</h1>
      <p className="mb-4">
        This demo shows how to integrate like buttons into your application. Likes are stored in the database and
        require authentication.
      </p>

      {authLoading ? (
        <p>Loading authentication status...</p>
      ) : user ? (
        <p>Logged in as: {user.email}</p>
      ) : (
        <p>Not logged in. Some features will be limited.</p>
      )}

      {loading ? (
        <p>Loading athletes...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map((athlete) => (
            <Card key={athlete.id}>
              <CardHeader>
                <CardTitle>{athlete.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <LikeButton athleteId={athlete.id} initialLikeCount={athlete.like_count || 0} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
