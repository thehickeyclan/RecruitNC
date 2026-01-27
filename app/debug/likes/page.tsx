"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LikeButton } from "@/components/like-button"

export default function LikesDebugPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userLikes, setUserLikes] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Check auth status
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      // Fetch athletes
      const { data: athletes } = await supabase.from("athletes").select("*").order("name").limit(10)

      setAthletes(athletes || [])

      // If user is logged in, fetch their likes
      if (user) {
        const { data: likes } = await supabase.from("likes").select("athlete_id").eq("user_id", user.id)

        setUserLikes((likes || []).map((like) => like.athlete_id))
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const runLikesTableSetup = async () => {
    try {
      const response = await fetch("/api/debug/setup-likes-table", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to set up likes table")
      }

      alert("Likes table setup completed successfully!")
    } catch (error) {
      console.error("Error setting up likes table:", error)
      alert("Error setting up likes table. Check console for details.")
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Likes Debug Page</h1>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Database Setup</h2>
        <p className="mb-4">Click the button below to set up the likes table and related database objects.</p>
        <Button onClick={runLikesTableSetup}>Set Up Likes Table</Button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        {user ? (
          <div>
            <p>Logged in as: {user.email}</p>
            <p>User ID: {user.id}</p>
          </div>
        ) : (
          <p>Not logged in. Some features will be limited.</p>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">Test Like Buttons</h2>

      {loading ? (
        <p>Loading athletes...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{athlete.name}</h3>
                  <p className="text-sm text-gray-500">{athlete.college || "No college"}</p>
                </div>
                <LikeButton
                  athleteId={athlete.id}
                  initialLikeCount={athlete.like_count || 0}
                  initialLiked={userLikes.includes(athlete.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
